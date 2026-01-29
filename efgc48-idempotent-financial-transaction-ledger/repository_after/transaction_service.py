import time
from idempotency_store import IdempotencyStore
from mock_database import MockDatabase


class ProcessingException(Exception):
    pass


class InsufficientFundsException(Exception):
    pass


class TransactionService:
    """Handles idempotent, atomic financial transactions."""

    def __init__(self, db: MockDatabase):
        self.db = db
        self.idempotency_store = IdempotencyStore()

    def transfer_funds(self, from_account, to_account, amount, idempotency_key):
        existing = self.idempotency_store.get(idempotency_key)
        if existing:
            status, result, _ = existing
            if status == "COMPLETED":
                return result
            elif status == "IN_PROGRESS":
                raise ProcessingException("Transaction already in progress")
            # else "FAILED" → allow retry

        self.idempotency_store.set(idempotency_key, "IN_PROGRESS", None)

        try:
            with self.db.transaction():
                if not self.db.update_balance_atomic(from_account, amount, is_add=False):
                    raise InsufficientFundsException("Insufficient funds")

                self.db.update_balance_atomic(to_account, amount, is_add=True)

                self.db.record_transaction(from_account, to_account, amount, idempotency_key)

            self.idempotency_store.set(idempotency_key, "COMPLETED", True)
            return True

        except Exception as e:
            # Check if transaction was actually committed (record exists)
            committed = any(
                r["idempotency_key"] == idempotency_key
                for r in self.db.records
            )
            if committed:
                self.idempotency_store.set(idempotency_key, "COMPLETED", True)
                return True
            else:
                self.idempotency_store.set(idempotency_key, "FAILED", False)
                raise