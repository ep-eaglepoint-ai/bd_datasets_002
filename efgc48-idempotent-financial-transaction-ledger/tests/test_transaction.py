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

            def atomic_side_effect(account, amount):
                nonlocal successful_count
                with lock:
                    if successful_count < 10:
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
            self.db.get_idempotency.return_value = ('COMPLETED', True)
            result = self.service.transfer_funds('A', 'B', 50, 'key1')
            self.assertTrue(result)
            # Should not call update

    def test_idempotency_in_progress(self):
        if HAS_IDEMPOTENCY:
            self.db.get_idempotency.return_value = ('IN_PROGRESS', None)
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
            self.db.set_idempotency.assert_called_with('key1', 'COMPLETED', True)

            # Reset mock
            self.db.reset_mock()
            # Second call: returns the same result without re-executing
            self.db.get_idempotency.return_value = ('COMPLETED', True)
            result2 = self.service.transfer_funds('A', 'B', 50, 'key1')
            self.assertTrue(result2)
            # Should not call update methods
            self.db.update_balance_atomic.assert_not_called()
            self.db.update_balance.assert_not_called()

if __name__ == '__main__':
    unittest.main()