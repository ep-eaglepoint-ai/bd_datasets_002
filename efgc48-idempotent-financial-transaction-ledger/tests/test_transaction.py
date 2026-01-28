import unittest
from unittest.mock import Mock
import threading
import time
import sys
import os

# Add both repository paths to sys.path for imports
repo_before_path = os.path.join(os.path.dirname(__file__), '../repository_before')
repo_after_path = os.path.join(os.path.dirname(__file__), '../repository_after')
sys.path.insert(0, repo_before_path)
sys.path.insert(0, repo_after_path)

# Determine which repository to use based on command-line argument or environment
REPO = 'after'  # default
if '--repo' in sys.argv:
    idx = sys.argv.index('--repo')
    if idx + 1 < len(sys.argv):
        REPO = sys.argv[idx + 1]
elif 'REPO' in os.environ:
    REPO = os.environ.get('REPO')

HAS_IDEMPOTENCY = (REPO == 'after')

if HAS_IDEMPOTENCY:
    from repository_after.TransactionService import TransactionService, ProcessingException, InsufficientFundsException
else:
    from repository_before.TransactionService import TransactionService
    # Define dummy exceptions for old code
    ProcessingException = type('ProcessingException', (Exception,), {})
    InsufficientFundsException = type('InsufficientFundsException', (Exception,), {})


class TestTransactionService(unittest.TestCase):
    def setUp(self):
        self.db = Mock()
        self.service = TransactionService(self.db)

    # ==================== BASIC FUNCTIONAL TESTS ====================

    def test_basic_transfer_success(self):
        """Test that transfer succeeds when sender has sufficient balance."""
        if HAS_IDEMPOTENCY:
            self.db.update_balance_atomic.return_value = True
            self.db.transaction.return_value.__enter__ = Mock()
            self.db.transaction.return_value.__exit__ = Mock(return_value=None)
            result = self.service.transfer_funds('A', 'B', 50, 'key1')
        else:
            self.db.get_balance.return_value = 100
            self.db.update_balance = Mock()
            result = self.service.transfer_funds('A', 'B', 50)
        self.assertTrue(result)

    def test_basic_insufficient_balance(self):
        """Test that transfer fails when sender has insufficient balance."""
        if HAS_IDEMPOTENCY:
            self.db.update_balance_atomic.return_value = False
            self.db.transaction.return_value.__enter__ = Mock()
            self.db.transaction.return_value.__exit__ = Mock(return_value=None)
            with self.assertRaises(InsufficientFundsException):
                self.service.transfer_funds('A', 'B', 50, 'key1')
        else:
            self.db.get_balance.return_value = 30
            self.db.update_balance = Mock()
            result = self.service.transfer_funds('A', 'B', 50)
            self.assertFalse(result)

    def test_basic_receiver_balance_increases(self):
        """Test that receiver balance increases correctly."""
        sender_balance = {'A': 100}
        receiver_balance = {'B': 0}
        lock = threading.Lock()

        if HAS_IDEMPOTENCY:
            def atomic_side_effect(account, amount, is_add=False):
                with lock:
                    if is_add:
                        receiver_balance[account] += amount
                        return True
                    else:
                        if sender_balance[account] >= amount:
                            sender_balance[account] -= amount
                            return True
                        return False

            self.db.update_balance_atomic.side_effect = atomic_side_effect
            self.db.transaction.return_value.__enter__ = Mock()
            self.db.transaction.return_value.__exit__ = Mock(return_value=None)
            result = self.service.transfer_funds('A', 'B', 50, 'key1')
        else:
            def update_balance_side_effect(account, amount):
                if account == 'A':
                    sender_balance[account] -= amount
                elif account == 'B':
                    receiver_balance[account] += amount

            self.db.get_balance.side_effect = lambda acc: sender_balance.get(acc, 0)
            self.db.update_balance.side_effect = update_balance_side_effect
            result = self.service.transfer_funds('A', 'B', 50)

        self.assertTrue(result)
        self.assertEqual(sender_balance['A'], 50)
        self.assertEqual(receiver_balance['B'], 50)

    # ==================== IDEMPOTENCY TESTS ====================

    def test_double_spend_prevention(self):
        """
        Test that same transaction cannot be processed twice.
        
        BUG IN OLD CODE: Without idempotency, if a client retries a failed HTTP request,
        the same transaction can be executed multiple times, causing double-spend.
        """
        if not HAS_IDEMPOTENCY:
            # Old code has this bug - skip test and document it
            self.skipTest("Old code doesn't support idempotency - double-spend is possible")
            return

        self.db.update_balance_atomic.return_value = True
        self.db.transaction.return_value.__enter__ = Mock()
        self.db.transaction.return_value.__exit__ = Mock(return_value=None)

        result1 = self.service.transfer_funds('A', 'B', 50, 'same_key')
        self.assertTrue(result1)

        self.db.update_balance_atomic.reset_mock()
        result2 = self.service.transfer_funds('A', 'B', 50, 'same_key')
        self.assertTrue(result2)
        self.db.update_balance_atomic.assert_not_called()

    def test_in_progress_exception(self):
        """Test that concurrent requests with same key raise ProcessingException."""
        if not HAS_IDEMPOTENCY:
            self.skipTest("Old code doesn't support idempotency key")
            return

        self.service.idempotency_store.set('key1', 'IN_PROGRESS', None)
        with self.assertRaises(ProcessingException):
            self.service.transfer_funds('A', 'B', 50, 'key1')

    def test_idempotency_retry_returns_same_result(self):
        """Test that retry with same key returns original result."""
        if not HAS_IDEMPOTENCY:
            # Old code doesn't support idempotency - retry executes transaction again
            self.skipTest("Old code doesn't support idempotency - retry executes transaction again")
            return

        self.db.update_balance_atomic.return_value = True
        self.db.transaction.return_value.__enter__ = Mock()
        self.db.transaction.return_value.__exit__ = Mock(return_value=None)

        result1 = self.service.transfer_funds('A', 'B', 50, 'key1')
        self.assertTrue(result1)

        self.db.update_balance_atomic.reset_mock()
        result2 = self.service.transfer_funds('A', 'B', 50, 'key1')
        self.assertEqual(result1, result2)
        self.db.update_balance_atomic.assert_not_called()

    def test_network_failure_idempotency_recovery(self):
        """Test that network failure doesn't cause double-spend on retry."""
        if not HAS_IDEMPOTENCY:
            self.skipTest("Old code doesn't support idempotency key")
            return

        self.db.update_balance_atomic.return_value = True
        self.db.transaction.return_value.__enter__ = Mock()
        self.db.transaction.return_value.__exit__ = Mock(return_value=None)

        original_set = self.service.idempotency_store.set
        call_count = [0]

        def set_side_effect(key, status, result=None):
            call_count[0] += 1
            if status == 'COMPLETED' and call_count[0] == 2:
                raise Exception("Network failure")
            original_set(key, status, result)

        self.service.idempotency_store.set = set_side_effect

        with self.assertRaises(Exception):
            self.service.transfer_funds('A', 'B', 50, 'key1')

        result = self.service.transfer_funds('A', 'B', 50, 'key1')
        self.assertTrue(result)

    def test_idempotency_key_expires_after_ttl(self):
        """Test that idempotency keys expire after TTL."""
        if not HAS_IDEMPOTENCY:
            self.skipTest("Old code doesn't support idempotency")
            return

        self.service.idempotency_store.set('key1', 'COMPLETED', True)
        self.service.idempotency_store.store['key1'] = (
            'COMPLETED',
            True,
            time.time() - 90000
        )
        self.assertIsNone(self.service.idempotency_store.get('key1'))

    # ==================== CONCURRENCY TESTS ====================

    def test_concurrency_no_over_withdrawal(self):
        """
        Test that 50 concurrent threads cannot over-withdraw from 100 balance.
        
        BUG IN OLD CODE: Race condition allows more than 10 withdrawals to succeed,
        depleting more than 100 from a 100 balance due to TOCTOU (Time-of-Check-Time-of-Use) vulnerability.
        
        NEW CODE: Atomic updates ensure only 10 withdrawals succeed.
        """
        shared_state = {
            'sender_balance': 100,
            'receiver_balance': 0,
            'lock': threading.Lock()
        }

        def make_transfer(thread_id):
            thread_db = Mock()

            if HAS_IDEMPOTENCY:
                # New code uses atomic updates with lock for thread safety
                def atomic_side_effect(account, amount, is_add=False):
                    with shared_state['lock']:
                        if is_add:
                            shared_state['receiver_balance'] += amount
                            return True
                        else:
                            if shared_state['sender_balance'] >= amount:
                                shared_state['sender_balance'] -= amount
                                return True
                            return False

                thread_db.update_balance_atomic.side_effect = atomic_side_effect
                thread_db.transaction.return_value.__enter__ = Mock()
                thread_db.transaction.return_value.__exit__ = Mock(return_value=None)

                service = TransactionService(thread_db)
                try:
                    result = service.transfer_funds('A', 'B', 10, f'unique_key_{thread_id}')
                    return result
                except (ProcessingException, InsufficientFundsException):
                    return False
            else:
                # Old code - uses get_balance and update_balance WITHOUT atomicity
                # BUG: get_balance reads value at call time, but update_balance uses that stale value
                def update_balance_side_effect(account, amount):
                    # Add small delay to increase chance of race condition
                    time.sleep(0.001)
                    # No lock - this is where the race condition happens
                    if account == 'A':
                        shared_state['sender_balance'] -= amount
                    elif account == 'B':
                        shared_state['receiver_balance'] += amount

                # get_balance.side_effect reads current value each time
                thread_db.get_balance.side_effect = lambda acc: shared_state['sender_balance']
                thread_db.update_balance.side_effect = update_balance_side_effect

                service = TransactionService(thread_db)
                result = service.transfer_funds('A', 'B', 10)
                return result

        results = []
        threads = []

        for i in range(50):
            def transfer(idx=i):
                result = make_transfer(idx)
                results.append(result)
            t = threading.Thread(target=transfer)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        successful = sum(results)
        final_balance = shared_state['sender_balance']
        final_receiver = shared_state['receiver_balance']

        if HAS_IDEMPOTENCY:
            # New code: Only 10 should succeed (atomic updates prevent over-withdrawal)
            self.assertEqual(successful, 10, f"Expected 10, got {successful}")
            self.assertEqual(final_balance, 0, f"Expected 0, got {final_balance}")
            self.assertEqual(final_receiver, 100, f"Expected 100, got {final_receiver}")
        else:
            # Old code: BUG - more than 10 succeed (race condition due to TOCTOU)
            # With 50 threads each withdrawing 10 from 100, we expect:
            # - If perfectly serialized: 10 succeed, 40 fail
            # - With race condition: 50 succeed (bug - withdraw 500 from 100)
            self.assertGreater(successful, 10,
                f"BUG CONFIRMED: More than 10 withdrawals succeeded from 100 balance (got {successful})")
            self.assertLess(final_balance, 0,
                f"BUG CONFIRMED: Balance went negative ({final_balance})")
            self.assertEqual(final_receiver, successful * 10,
                f"BUG CONFIRMED: Receiver got {final_receiver} instead of expected")

    def test_receiver_concurrent_updates(self):
        """Test that concurrent transfers to same receiver are protected."""
        if not HAS_IDEMPOTENCY:
            self.skipTest("Testing new feature only")
            return

        receiver_balance = {'B': 0}
        lock = threading.Lock()

        def atomic_side_effect(account, amount, is_add=False):
            with lock:
                if is_add:
                    receiver_balance[account] += amount
                return True

        self.db.update_balance_atomic.side_effect = atomic_side_effect
        self.db.transaction.return_value.__enter__ = Mock()
        self.db.transaction.return_value.__exit__ = Mock(return_value=None)

        results = []
        threads = []

        for i in range(10):
            def transfer(idx=i):
                result = self.service.transfer_funds('A', 'B', 10, f'key_{idx}')
                results.append(result)
            t = threading.Thread(target=transfer)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        self.assertEqual(sum(results), 10)
        self.assertEqual(receiver_balance['B'], 100)

    # ==================== FAILURE & ROLLBACK TESTS ====================

    def test_database_timeout_rollback(self):
        """Test that database timeout causes proper rollback."""
        if not HAS_IDEMPOTENCY:
            self.skipTest("Old code doesn't support idempotency")
            return

        self.db.update_balance_atomic.return_value = True
        self.db.transaction.return_value.__enter__ = Mock()
        self.db.transaction.return_value.__exit__ = Mock(side_effect=Exception("Database timeout"))

        with self.assertRaises(Exception):
            self.service.transfer_funds('A', 'B', 50, 'key1')

        state = self.service.idempotency_store.get('key1')
        self.assertEqual(state[0], 'FAILED')

    def test_failed_state_no_overwrite_completed(self):
        """Test that FAILED status doesn't overwrite COMPLETED."""
        if not HAS_IDEMPOTENCY:
            self.skipTest("Old code doesn't support idempotency")
            return

        self.db.update_balance_atomic.return_value = True
        self.db.transaction.return_value.__enter__ = Mock()
        self.db.transaction.return_value.__exit__ = Mock(side_effect=Exception("Transaction failed"))

        with self.assertRaises(Exception):
            self.service.transfer_funds('A', 'B', 50, 'key1')

        self.service.idempotency_store.set('key1', 'COMPLETED', True)
        result = self.service.transfer_funds('A', 'B', 50, 'key1')
        self.assertTrue(result)

    def test_connection_failure_after_commit(self):
        """Test edge case: connection fails after commit but before idempotency update."""
        if not HAS_IDEMPOTENCY:
            self.skipTest("Old code doesn't support idempotency")
            return

        self.db.update_balance_atomic.return_value = True
        self.db.transaction.return_value.__enter__ = Mock()
        self.db.transaction.return_value.__exit__ = Mock(return_value=None)

        original_set = self.service.idempotency_store.set
        calls = []

        def set_side_effect(key, status, result=None):
            calls.append((key, status, result))
            if status == 'COMPLETED':
                raise Exception("Connection failed to idempotency store")
            original_set(key, status, result)

        self.service.idempotency_store.set = set_side_effect

        with self.assertRaises(Exception):
            self.service.transfer_funds('A', 'B', 50, 'key1')

        in_progress_calls = [c for c in calls if c[1] == 'IN_PROGRESS']
        completed_calls = [c for c in calls if c[1] == 'COMPLETED']
        self.assertEqual(len(in_progress_calls), 1)
        self.assertEqual(len(completed_calls), 1)

        self.service.idempotency_store.set = original_set
        self.service.idempotency_store.set('key1', 'COMPLETED', True)
        result = self.service.transfer_funds('A', 'B', 50, 'key1')
        self.assertTrue(result)


if __name__ == '__main__':
    unittest.main()
