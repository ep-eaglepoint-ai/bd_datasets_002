import unittest
import threading
import time
from unittest import mock
from transaction_service import (
    TransactionService,
    MockDatabase,
    ProcessingException,
    InsufficientFundsException
)


class TestTransactionService(unittest.TestCase):
    def setUp(self):
        self.db = MockDatabase()
        self.db.add_account("alice", 100)
        self.db.add_account("bob", 0)
        self.service = TransactionService(self.db)

    def test_basic_fund_transfer(self):
        key = "tx-basic-1"
        result = self.service.transfer_funds("alice", "bob", 30, idempotency_key=key)
        self.assertTrue(result)
        self.assertEqual(self.db.balances["alice"], 70)
        self.assertEqual(self.db.balances["bob"], 30)

    def test_balance_check_prevents_overdraft(self):
        key = "tx-basic-2"
        with self.assertRaises(InsufficientFundsException):
            self.service.transfer_funds("alice", "bob", 200, idempotency_key=key)
        self.assertEqual(self.db.balances["alice"], 100)
        self.assertEqual(self.db.balances["bob"], 0)

    def test_idempotency_store_returns_original_result(self):
        key = "tx-123"
        result1 = self.service.transfer_funds("alice", "bob", 10, idempotency_key=key)
        result2 = self.service.transfer_funds("alice", "bob", 10, idempotency_key=key)
        self.assertEqual(result1, True)
        self.assertEqual(result2, True)
        self.assertEqual(self.db.balances["alice"], 90)
        self.assertEqual(self.db.balances["bob"], 10)

    def test_atomicity_and_rollback(self):
        key = "tx-atomic"
        original_update = self.db.update_balance_atomic

        def fail_receiver(account_id, amount, is_add=False):
            if account_id == "bob" and is_add:
                raise Exception("Simulated failure")
            return original_update(account_id, amount, is_add)

        with mock.patch.object(self.db, 'update_balance_atomic', side_effect=fail_receiver):
            with self.assertRaises(Exception):
                self.service.transfer_funds("alice", "bob", 10, idempotency_key=key)

        self.assertEqual(self.db.balances["alice"], 100)  # rolled back
        self.assertEqual(self.db.balances["bob"], 0)
        status, result, _ = self.service.idempotency_store.get(key)
        self.assertEqual(status, "FAILED")
        self.assertEqual(result, False)

    def test_in_progress_transaction_raises_exception(self):
        key = "tx-inprogress"

        def slow_transfer():
            try:
                self.service.transfer_funds("alice", "bob", 5, idempotency_key=key)
            except Exception:
                pass  # swallow exception so thread doesn't crash the test

        original_set = self.service.idempotency_store.set

        def delayed_set(*args, **kwargs):
            original_set(*args, **kwargs)
            if args[1] == "IN_PROGRESS":
                time.sleep(1.2)

        self.service.idempotency_store.set = delayed_set

        t = threading.Thread(target=slow_transfer)
        t.start()

        time.sleep(0.3)

        with self.assertRaises(ProcessingException) as cm:
            self.service.transfer_funds("alice", "bob", 10, idempotency_key=key)

        self.assertIn("already in progress", str(cm.exception).lower())

        t.join()

        self.service.idempotency_store.set = original_set

    def test_concurrent_withdrawals(self):
        threads = []
        results = []
        exceptions = []

        def worker(thread_id):
            try:
                key = f"tx-{thread_id}"
                res = self.service.transfer_funds("alice", "bob", 10, idempotency_key=key)
                results.append(res)
            except Exception as e:
                exceptions.append(e)

        for i in range(50):
            t = threading.Thread(target=worker, args=(i,))
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        self.assertEqual(self.db.balances["alice"], 0)
        self.assertEqual(self.db.balances["bob"], 100)
        self.assertEqual(len(self.db.records), 10, "Exactly 10 transaction records should exist")
        self.assertTrue(all(r is True for r in results[:10]))
        self.assertTrue(all(isinstance(e, InsufficientFundsException) for e in exceptions))

    def test_idempotency_retry_after_failure(self):
        key = "tx-failure"

        # Simulate commit succeeded but network failed before setting COMPLETED
        def fail_after_record(*args, **kwargs):
            # Do the real record
            orig = self.db.record_transaction
            orig(*args, **kwargs)
            raise Exception("Network failure after commit")

        with mock.patch.object(self.db, 'record_transaction', side_effect=fail_after_record):
            with self.assertRaises(Exception):
                self.service.transfer_funds("alice", "bob", 10, key)

        # Now retry – should detect the record and mark COMPLETED automatically
        result = self.service.transfer_funds("alice", "bob", 10, key)
        self.assertTrue(result)
        self.assertEqual(self.db.balances["alice"], 90)
        self.assertEqual(self.db.balances["bob"], 10)

        status, res, _ = self.service.idempotency_store.get(key)
        self.assertEqual(status, "COMPLETED")


if __name__ == "__main__":
    unittest.main()