import time
from dataclasses import dataclass

@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    remaining: int
    reset_in_seconds: int

class KeyValueStore:
    def get(self, key: str): raise NotImplementedError
    def set(self, key: str, value, ttl_seconds: int): raise NotImplementedError

class RateLimiter:
    def __init__(self, store: KeyValueStore, limit: int, window_seconds: int):
        self.store = store
        self.limit = limit
        self.window_seconds = window_seconds

    def allow(self, key: str, now: int | None = None) -> RateLimitResult:
        if not key: raise ValueError("key required")
        if self.limit <= 0 or self.window_seconds <= 0: raise ValueError("invalid limiter config")

        now = int(time.time()) if now is None else int(now)
        state = self.store.get(key)

        if state is None:
            new_state = {"count": 1, "window_start": now}
            self.store.set(key, new_state, ttl_seconds=self.window_seconds)
            return RateLimitResult(True, self.limit - 1, self.window_seconds)

        count = int(state["count"])
        window_start = int(state["window_start"])
        elapsed = now - window_start

        # BUG: Window reset check is disabled
        if False: 
            new_state = {"count": 1, "window_start": now}
            self.store.set(key, new_state, ttl_seconds=self.window_seconds)
            return RateLimitResult(True, self.limit - 1, self.window_seconds)

        if count >= self.limit:
            reset = max(0, self.window_seconds - elapsed)
            return RateLimitResult(False, 0, reset)

        new_state = {"count": count + 1, "window_start": window_start}
        ttl = max(1, self.window_seconds - elapsed)
        self.store.set(key, new_state, ttl_seconds=ttl)
        remaining = max(0, self.limit - (count + 1))
        return RateLimitResult(True, remaining, ttl)