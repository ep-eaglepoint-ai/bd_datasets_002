import time
import copy
import threading
from contextlib import contextmanager


class MockDatabase:
    """
    Mock database with transaction support.
    - Changes are buffered during a transaction and only applied on commit.
    - Rollback discards pending changes and restores snapshot.
    - Thread-safe with per-account locks + global transaction lock.
    """

    def __init__(self):
        self.balances = {}                    # committed balances: account_id → float/int
        self.records = []                     # committed transaction records
        self.locks = {}                       # account_id → threading.Lock
        self.transaction_lock = threading.Lock()   # prevents concurrent transactions
        self._current_transaction = None

    def begin(self):
        """Acquire global lock and create transaction context with snapshots."""
        self.transaction_lock.acquire()
        self._current_transaction = {
            "pending_balances": {},           # temporary balance changes
            "pending_records": [],            # temporary transaction records
            "balances_snapshot": copy.deepcopy(self.balances),
            "records_snapshot": copy.deepcopy(self.records),
            "locks_snapshot": self.locks.copy()
        }

    def commit(self):
        """Apply pending changes and release lock."""
        if self._current_transaction:
            self.balances.update(self._current_transaction["pending_balances"])
            self.records.extend(self._current_transaction["pending_records"])
            self._current_transaction = None
        self.transaction_lock.release()

    def rollback(self):
        """Discard pending changes and restore from snapshot."""
        if self._current_transaction:
            self.balances = self._current_transaction["balances_snapshot"]
            self.records = self._current_transaction["records_snapshot"]
            self.locks = self._current_transaction["locks_snapshot"]
            self._current_transaction = None
        self.transaction_lock.release()

    @contextmanager
    def transaction(self):
        """Context manager for atomic operations."""
        self.begin()
        try:
            yield
            self.commit()
        except Exception:
            self.rollback()
            raise

    def add_account(self, account_id, initial_balance):
        """Add a new account with starting balance."""
        self.balances[account_id] = initial_balance
        self.locks[account_id] = threading.Lock()

    def update_balance_atomic(self, account_id, amount, is_add=False):
        """
        Atomically update balance.
        - Inside transaction: buffer changes
        - Outside transaction: direct update (fallback, rarely used here)
        """
        if account_id not in self.locks:
            self.locks[account_id] = threading.Lock()

        with self.locks[account_id]:
            if self._current_transaction is not None:
                pending = self._current_transaction["pending_balances"]
                if account_id not in pending:
                    pending[account_id] = self.balances.get(account_id, 0)
                current = pending[account_id]

                if is_add:
                    pending[account_id] = current + amount
                    return True
                else:
                    if current >= amount:
                        pending[account_id] = current - amount
                        return True
                    return False
            else:
                # Direct (non-transactional) update
                current = self.balances.get(account_id, 0)
                if is_add:
                    self.balances[account_id] = current + amount
                    return True
                else:
                    if current >= amount:
                        self.balances[account_id] = current - amount
                        return True
                    return False

    def record_transaction(self, from_account, to_account, amount, idempotency_key):
        """Record a transaction – buffered in tx, direct otherwise."""
        record = {
            "from": from_account,
            "to": to_account,
            "amount": amount,
            "idempotency_key": idempotency_key,
            "timestamp": time.time()
        }

        if self._current_transaction is not None:
            self._current_transaction["pending_records"].append(record)
        else:
            self.records.append(record)

    # Optional: useful for testing / debugging
    def get_balance(self, account_id):
        return self.balances.get(account_id, 0)

    def get_transaction_count(self):
        return len(self.records)