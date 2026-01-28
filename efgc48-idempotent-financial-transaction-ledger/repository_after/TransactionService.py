import time
import threading
from contextlib import contextmanager


class ProcessingException(Exception):
    pass


class InsufficientFundsException(Exception):
    pass


class IdempotencyStore:
    def __init__(self, ttl_seconds=86400):  # 24 hours
        self.store = {}
        self.ttl = ttl_seconds
        self.lock = threading.Lock()

    def _is_expired(self, timestamp):
        return (time.time() - timestamp) > self.ttl

    def get(self, key):
        with self.lock:
            entry = self.store.get(key)
            if not entry:
                return None
            status, result, timestamp = entry
            if self._is_expired(timestamp):
                del self.store[key]
                return None
            return status, result

    def set(self, key, status, result):
        with self.lock:
            self.store[key] = (status, result, time.time())

    def delete(self, key):
        with self.lock:
            if key in self.store:
                del self.store[key]


class MockDatabase:
    def __init__(self):
        self.balances = {}
        self.locks = {}

    def add_account(self, account_id, balance):
        self.balances[account_id] = balance
        self.locks[account_id] = threading.Lock()

    def update_balance_atomic(self, account_id, amount, is_add=False):
        # Get or create lock for this account
        if account_id not in self.locks:
            self.locks[account_id] = threading.Lock()
        
        lock = self.locks[account_id]
        with lock:
            if is_add:
                # For deposits, always succeed and add amount
                if account_id not in self.balances:
                    self.balances[account_id] = 0
                self.balances[account_id] += amount
                return True
            else:
                # For withdrawals, check if sufficient balance exists
                if self.balances.get(account_id, 0) >= amount:
                    self.balances[account_id] -= amount
                    return True
                return False

    @contextmanager
    def transaction(self):
        try:
            yield
        except Exception:
            raise


class TransactionService:
    def __init__(self, db):
        self.db = db
        self.idempotency_store = IdempotencyStore()

    def transfer_funds(self, from_account, to_account, amount, idempotency_key):
        # Check idempotency store first
        existing = self.idempotency_store.get(idempotency_key)
        if existing:
            status, result = existing
            if status == 'COMPLETED':
                return result
            elif status == 'IN_PROGRESS':
                raise ProcessingException("Transaction is already in progress")
            elif status == 'FAILED':
                # Allow retry
                pass

        # Mark as in progress
        self.idempotency_store.set(idempotency_key, 'IN_PROGRESS', None)

        try:
            # Perform atomic updates within transaction
            # Both sender and receiver updates are atomic and locked
            with self.db.transaction():
                # Withdraw from sender - atomic check-and-update
                sender_ok = self.db.update_balance_atomic(from_account, amount, is_add=False)
                if not sender_ok:
                    raise InsufficientFundsException("Insufficient funds")

                # Deposit to receiver - atomic update with lock
                receiver_ok = self.db.update_balance_atomic(to_account, amount, is_add=True)
                if not receiver_ok:
                    raise Exception("Receiver update failed")

            # Transaction committed successfully - update idempotency store
            self.idempotency_store.set(idempotency_key, 'COMPLETED', True)
            return True

        except Exception as e:
            # Transaction failed - mark as FAILED
            # This allows retry with same key
            current = self.idempotency_store.get(idempotency_key)
            if not current or current[0] != 'COMPLETED':
                self.idempotency_store.set(idempotency_key, 'FAILED', False)
            raise
