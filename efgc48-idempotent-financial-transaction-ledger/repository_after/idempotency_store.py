import time
import threading


class IdempotencyStore:
    """Thread-safe in-memory idempotency store with TTL."""

    TTL_SECONDS = 24 * 60 * 60  # 24 hours

    def __init__(self):
        self.store = {}  # key -> (status, result, timestamp)
        self.lock = threading.Lock()

    def _cleanup_expired(self):
        now = time.time()
        expired = [k for k, v in self.store.items() if now - v[2] > self.TTL_SECONDS]
        for k in expired:
            del self.store[k]

    def get(self, key):
        with self.lock:
            self._cleanup_expired()
            return self.store.get(key)

    def set(self, key, status, result=None):
        with self.lock:
            self.store[key] = (status, result, time.time())
