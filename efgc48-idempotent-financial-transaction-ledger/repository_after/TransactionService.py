from IdempotencyStore import IdempotencyStore

class ProcessingException(Exception):
    pass

class TransactionService:
    def __init__(self, db_session):
        self.db = db_session
        self.idempotency_store = IdempotencyStore(db_session)

    def transfer_funds(self, from_account, to_account, amount, idempotency_key):
        # Check idempotency
        existing = self.idempotency_store.get(idempotency_key)
        if existing:
            status, result = existing
            if status == 'COMPLETED':
                return result
            elif status == 'IN_PROGRESS':
                raise ProcessingException("Transaction is already in progress")

        # Mark as in progress
        self.idempotency_store.set(idempotency_key, 'IN_PROGRESS')

        try:
            with self.db.transaction():
                # Use atomic update for concurrency
                if not self.db.update_balance_atomic(from_account, amount):
                    result = False
                else:
                    # Update to_account
                    to_balance = self.db.get_balance(to_account)
                    self.db.update_balance(to_account, to_balance + amount)
                    result = True

                # Commit happens here
                self.idempotency_store.set(idempotency_key, 'COMPLETED', result)
                return result
        except Exception as e:
            # Rollback on error
            self.db.rollback()
            # Reset idempotency if failed
            self.idempotency_store.set(idempotency_key, 'FAILED', False)
            raise e