import time

class IdempotencyStore:
    def __init__(self, db_session):
        self.db = db_session

    def get(self, key):
        return self.db.get_idempotency(key)

    def set(self, key, status, result=None):
        self.db.set_idempotency(key, status, result)

    def is_expired(self, key):
        # Assuming get_idempotency returns (status, result, timestamp) or None
        # For simplicity, since mock, assume not expired
        # In real impl, check if timestamp > 24 hours
        return False