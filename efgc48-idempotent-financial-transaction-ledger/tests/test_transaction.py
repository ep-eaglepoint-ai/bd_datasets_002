import unittest
from unittest.mock import Mock, MagicMock, patch
import threading
import time

try:
    from TransactionService import TransactionService, ProcessingException
    HAS_IDEMPOTENCY = True
except ImportError:
    from TransactionService import TransactionService
    HAS_IDEMPOTENCY = False

class TestTransactionService(unittest.TestCase):
    def setUp(self):
        self.db = Mock()
        self.db.delete_idempotency = Mock()
        self.service = TransactionService(self.db)

    def test_successful_transfer(self):
        if HAS_IDEMPOTENCY:
            self.db.get_balance.return_value = 50  # to_account balance
            self.db.update_balance = Mock()
            self.db.get_idempotency.return_value = None
            self.db.set_idempotency = Mock()
            self.db.update_balance_atomic.return_value = True
            self.db.transaction.return_value.__enter__ = Mock()
            self.db.transaction.return_value.__exit__ = Mock()
            result = self.service.transfer_funds('A', 'B', 50, 'key1')
            self.assertTrue(result)
            self.db.update_balance_atomic.assert_called_with('A', 50)
            self.db.update_balance.assert_called_with('B', 100)
            # Check the COMPLETED call
            completed_calls = [call for call in self.db.set_idempotency.call_args_list if call[0][1] == 'COMPLETED']
            self.assertEqual(len(completed_calls), 1)
            args = completed_calls[0][0]
            self.assertEqual(args[0], 'key1')
            self.assertEqual(args[1], 'COMPLETED')
            self.assertEqual(args[2], True)
        else:
            # Old code doesn't support idempotency_key, so calling with key should raise TypeError
            self.service.transfer_funds('A', 'B', 50, 'key1')  # This will raise TypeError, failing the test

    def test_insufficient_balance(self):
        if HAS_IDEMPOTENCY:
            self.db.get_idempotency.return_value = None
            self.db.set_idempotency = Mock()
            self.db.update_balance_atomic.return_value = False
            self.db.transaction.return_value.__enter__ = Mock()
            self.db.transaction.return_value.__exit__ = Mock()
            result = self.service.transfer_funds('A', 'B', 50, 'key1')
            self.assertFalse(result)
        else:
            # Old code doesn't support idempotency_key
            self.service.transfer_funds('A', 'B', 50, 'key1')  # This will raise TypeError, failing the test

    def test_concurrency_50_threads(self):
        # Simulate 50 concurrent transfers of 10 from account with 100
        results = []
        threads = []

        if HAS_IDEMPOTENCY:
            # Use atomic update to limit to 10 successes
            successful_count = 0
            lock = threading.Lock()
            balance = 100

            def atomic_side_effect(account, amount):
                nonlocal successful_count, balance
                with lock:
                    if balance >= amount:
                        balance -= amount
                        successful_count += 1
                        return True
                    return False

            self.db.update_balance_atomic.side_effect = atomic_side_effect
            self.db.get_balance.return_value = 100
            self.db.update_balance = Mock()
            self.db.get_idempotency.return_value = None
            self.db.set_idempotency = Mock()
            self.db.transaction.return_value.__enter__ = Mock()
            self.db.transaction.return_value.__exit__ = Mock()

            for i in range(50):
                def transfer(idx=i):
                    result = self.service.transfer_funds('A', 'B', 10, f'key{idx}')
                    results.append(result)
                t = threading.Thread(target=transfer)
                threads.append(t)
                t.start()

            for t in threads:
                t.join()

            successful = sum(results)
            self.assertEqual(successful, 10)
            self.assertEqual(balance, 0)  # Final balance should be 0
            # Count transaction records: number of successful COMPLETED idempotency sets
            completed_calls = [call for call in self.db.set_idempotency.call_args_list if call[0][1] == 'COMPLETED' and call[0][2] == True]
            self.assertEqual(len(completed_calls), 10)
        else:
            # Old code: no atomic, so all succeed since balance always 100
            self.db.get_balance.return_value = 100
            self.db.update_balance = Mock()

            for i in range(50):
                def transfer(idx=i):
                    result = self.service.transfer_funds('A', 'B', 10)
                    results.append(result)
                t = threading.Thread(target=transfer)
                threads.append(t)
                t.start()

            for t in threads:
                t.join()

            successful = sum(results)
            # Old code allows over-withdrawal, so all 50 succeed, but test expects 10, so fails
            self.assertEqual(successful, 10)  # This will fail for old code

    def test_idempotency_completed(self):
        if HAS_IDEMPOTENCY:
            self.db.get_idempotency.return_value = ('COMPLETED', True, time.time())
            result = self.service.transfer_funds('A', 'B', 50, 'key1')
            self.assertTrue(result)
            # Should not call update

    def test_idempotency_in_progress(self):
        if HAS_IDEMPOTENCY:
            self.db.get_idempotency.return_value = ('IN_PROGRESS', None, time.time())
            with self.assertRaises(ProcessingException):
                self.service.transfer_funds('A', 'B', 50, 'key1')

    def test_idempotency_retry_after_failure(self):
        if HAS_IDEMPOTENCY:
            # First call: succeeds, idempotency set to COMPLETED
            self.db.get_balance.return_value = 50
            self.db.get_idempotency.return_value = None
            self.db.update_balance_atomic.return_value = True
            self.db.transaction.return_value.__enter__ = Mock()
            self.db.transaction.return_value.__exit__ = Mock(return_value=None)
            result1 = self.service.transfer_funds('A', 'B', 50, 'key1')
            self.assertTrue(result1)
            self.db.set_idempotency.assert_called_with('key1', 'COMPLETED', True, unittest.mock.ANY)

            # Reset mock
            self.db.reset_mock()
            # Second call: returns the same result without re-executing
            self.db.get_idempotency.return_value = ('COMPLETED', True, time.time())
            result2 = self.service.transfer_funds('A', 'B', 50, 'key1')
            self.assertTrue(result2)
            # Should not call update methods
            self.db.update_balance_atomic.assert_not_called()
            self.db.update_balance.assert_not_called()

    def test_idempotency_network_failure_simulation(self):
        if HAS_IDEMPOTENCY:
            # Simulate network failure after successful update
            self.db.get_balance.return_value = 50
            self.db.get_idempotency.return_value = None
            self.db.update_balance_atomic.return_value = True
            self.db.transaction.return_value.__enter__ = Mock()
            self.db.transaction.return_value.__exit__ = Mock(return_value=None)

            # Mock set_idempotency to raise after first call
            original_set = self.db.set_idempotency
            call_count = 0
            def set_side_effect(*args, **kwargs):
                nonlocal call_count
                call_count += 1
                result = original_set(*args, **kwargs)
                if call_count == 1 and args[1] == 'COMPLETED':
                    raise Exception("Network failure")
                return result
            self.db.set_idempotency.side_effect = set_side_effect

            # First call: succeeds but raises network failure after setting idempotency
            with self.assertRaises(Exception):
                self.service.transfer_funds('A', 'B', 50, 'key1')

            # Check that idempotency was set to COMPLETED
            self.db.get_idempotency.assert_called_with('key1')
            # Since it raised after set, but in code, since exception after set, and get is None check, but wait.

            # Actually, since the set succeeded, and then exception, the get will return COMPLETED, so it won't set to FAILED.

            # Now, retry: should return the stored result without re-executing
            self.db.reset_mock()
            self.db.get_idempotency.return_value = ('COMPLETED', True, time.time())
            result = self.service.transfer_funds('A', 'B', 50, 'key1')
            self.assertTrue(result)
            # Should not call update methods
            self.db.update_balance_atomic.assert_not_called()
            self.db.update_balance.assert_not_called()

if __name__ == '__main__':
    unittest.main()