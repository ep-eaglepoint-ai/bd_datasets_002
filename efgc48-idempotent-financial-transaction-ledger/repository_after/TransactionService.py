from IdempotencyStore import IdempotencyStore

class ProcessingException(Exception):
    """Raised when a transaction with the same idempotency key is already in progress."""
    pass

class TransactionService:
    """Service for handling financial transactions with idempotency and concurrency control."""

    def __init__(self, db_session):
        self.db = db_session
        self.idempotency_store = IdempotencyStore(db_session)

    def transfer_funds(self, from_account, to_account, amount, idempotency_key):
        """Transfer funds between accounts, ensuring idempotency and atomicity."""
        existing = self.idempotency_store.get(idempotency_key)
        if existing:
            status, result = existing
            if status == 'COMPLETED':
                return result
            elif status == 'IN_PROGRESS':
                raise ProcessingException("Transaction is already in progress")

        self.idempotency_store.set(idempotency_key, 'IN_PROGRESS')

        try:
            with self.db.transaction():
                if not self.db.update_balance_atomic(from_account, amount):
                    result = False
                else:
                    to_balance = self.db.get_balance(to_account)
                    self.db.update_balance(to_account, to_balance + amount)
                    result = True

                self.idempotency_store.set(idempotency_key, 'COMPLETED', result)
                return result
        except Exception as e:
            self.db.rollback()
            self.idempotency_store.set(idempotency_key, 'FAILED', False)
            raise e