import time
import threading

class IdempotencyStore:
    """
    In-memory idempotency store with TTL and transactional semantics.
    In real systems this would be backed by a database table.
    """

    TTL_SECONDS = 24 * 60 * 60  # 24 hours

    def __init__(self, db_session):
        self.db = db_session
        self._store = {}
        self._lock = threading.Lock()

    def _cleanup_expired(self):
        now = time.time()
        expired = [k for k, v in self._store.items() if now - v[2] > self.TTL_SECONDS]
        for k in expired:
            del self._store[k]

    def get(self, key):
        with self._lock:
            self._cleanup_expired()
            return self._store.get(key)

    def set(self, key, status, result=None):
        with self._lock:
            self._store[key] = (status, result, time.time())

    def delete(self, key):
        with self._lock:
            if key in self._store:
                del self._store[key]
