class IdempotencyStore:
    """Handles idempotency key storage and retrieval for 24-hour expiry."""

    def __init__(self, db_session):
        self.db = db_session

    def get(self, key):
        """Retrieve the status and result for the given idempotency key."""
        return self.db.get_idempotency(key)

    def set(self, key, status, result=None):
        """Store the status and result for the given idempotency key."""
        self.db.set_idempotency(key, status, result)