import time
from typing import Dict, Type, Optional
from types_limiter import RateLimiterConfig, AlgorithmType
from storage import Storage, InMemoryStorage
from algorithms import (
    BaseAlgorithm, FixedWindow, SlidingWindowLog, 
    SlidingWindowCounter, TokenBucket
)

class RateLimiter:
    _ALGO_MAP: Dict[AlgorithmType, Type[BaseAlgorithm]] = {
        AlgorithmType.FIXED: FixedWindow,
        AlgorithmType.SLIDING_LOG: SlidingWindowLog,
        AlgorithmType.SLIDING_COUNTER: SlidingWindowCounter,
        AlgorithmType.TOKEN_BUCKET: TokenBucket,
    }

    def __init__(self, config: RateLimiterConfig, storage: Optional[Storage] = None):
        self.config = config
        self.storage = storage or InMemoryStorage()
        self.algo = self._ALGO_MAP[config.algorithm](config)
        
        # Calculate how long we should keep data in storage
        if config.algorithm == AlgorithmType.TOKEN_BUCKET:
            # Keep until bucket is full: capacity / rate
            self._ttl = config.bucket_capacity / config.refill_rate
        else:
            # Keep for at least one full window
            self._ttl = config.window_size_seconds

    def is_allowed(self, key: str) -> bool:
        lock = self.storage.get_lock(key)
        with lock:
            now = time.time()
            state = self.storage.get(key)
            allowed, new_state = self.algo.is_allowed(state, now)
            
            # Requirement 2 fix: Pass the TTL so cleanup knows when to delete
            if allowed:
                self.storage.set(key, new_state, ttl=self._ttl)
            return allowed

    def get_remaining(self, key: str) -> int:
        lock = self.storage.get_lock(key)
        with lock:
            state = self.storage.get(key)
            return self.algo.get_remaining(state, time.time())

    def get_reset_time(self, key: str) -> float:
        lock = self.storage.get_lock(key)
        with lock:
            state = self.storage.get(key)
            return self.algo.get_reset_time(state, time.time())

    def reset(self, key: str) -> None:
        lock = self.storage.get_lock(key)
        with lock:
            self.storage.delete(key)