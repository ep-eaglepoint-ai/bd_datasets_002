import time

class IdempotencyStore:
    """Handles idempotency key storage and retrieval for 24-hour expiry."""

    def __init__(self, db_session):
        self.db = db_session
        self.expiry_seconds = 24 * 60 * 60  # 24 hours

    def get(self, key):
        """Retrieve the status and result for the given idempotency key."""
        data = self.db.get_idempotency(key)
        if data is None:
            return None
        status, result, timestamp = data
        if time.time() - timestamp > self.expiry_seconds:
            # Expired, remove it
            self.db.delete_idempotency(key)
            return None
        return (status, result)

    def set(self, key, status, result=None):
        """Store the status and result for the given idempotency key."""
        timestamp = time.time()
        self.db.set_idempotency(key, status, result, timestamp)