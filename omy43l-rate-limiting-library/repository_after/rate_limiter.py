import time
import math
import threading
import json
import yaml
import asyncio
import functools
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Callable, Deque, Union
from collections import deque

@dataclass
class RateLimitResult:
    allowed: bool
    remaining: int
    limit: int
    reset_at: float
    retry_after: float

class RateLimitExceeded(Exception):
    def __init__(self, limit_result: RateLimitResult, client_id: str, limiter_name: str):
        self.limit_result = limit_result
        self.client_id = client_id
        self.limiter_name = limiter_name
        super().__init__(f"Rate limit exceeded for client {client_id} on {limiter_name}. Retry after {limit_result.retry_after}s")

class RateLimiter(ABC):
    """
    Base class for all rate limiting algorithms.
    
    Locking Strategy:
    This implementation uses lock sharding to minimize lock contention in multi-threaded environments. 
    Instead of a single global lock for all clients, the state is partitioned into multiple shards 
    based on the hash of the client_id. This significantly reduces the probability of threads 
    blocking each other when processing requests for different clients.
    
    Sharding Rationale:
    A default shard count of 1024 is chosen to provide a high degree of parallelism. 
    In a typical high-throughput system, this allows hundreds of concurrent threads to operate 
    with minimal collision probability (assuming a uniform distribution of client IDs), 
    while keeping the memory overhead of the locks manageable (around 64KB on most systems).
    """
    def __init__(self, shard_count: int = 1024, ttl: float = 3600.0):
        # Implementation of Lock Sharding to prevent master lock bottleneck
        self._shard_count = shard_count
        self._shards = [threading.Lock() for _ in range(shard_count)]
        self._last_access: Dict[str, float] = {}
        self._ttl = ttl
        
        # Background Janitor to prevent O(n) memory exhaustion
        self._stop_janitor = threading.Event()
        self._janitor = threading.Thread(target=self._run_janitor, daemon=True)
        self._janitor.start()

    def _get_shard(self, client_id: str) -> threading.Lock:
        return self._shards[abs(hash(client_id)) % self._shard_count]

    def _run_janitor(self):
        """Thread-safe background pruning of stale client states."""
        while not self._stop_janitor.is_set():
            # Check every second or half the TTL, whichever is smaller
            time.sleep(min(1.0, self._ttl / 2))
            now = time.time()
            
            # Snapshot keys to avoid 'dict changed size during iteration'
            for cid in list(self._last_access.keys()):
                if now - self._last_access.get(cid, 0) > self._ttl:
                    shard = self._get_shard(cid)
                    with shard:
                        # Double-check inside lock
                        if now - self._last_access.get(cid, 0) > self._ttl:
                            self._cleanup_client(cid)
                            self._last_access.pop(cid, None)

    @abstractmethod
    def _cleanup_client(self, client_id: str):
        """Algorithm-specific state removal."""
        pass

    @abstractmethod
    def is_allowed(self, client_id: str) -> bool:
        pass

    @abstractmethod
    def try_acquire(self, client_id: str) -> RateLimitResult:
        pass

    @property
    @abstractmethod
    def algorithm_name(self) -> str:
        pass

    @property
    @abstractmethod
    def current_config(self) -> Dict[str, Any]:
        pass

    @classmethod
    def from_config(cls, config: Dict[str, Any]) -> 'RateLimiter':
        return RateLimiterFactory.create(config)

class TokenBucketLimiter(RateLimiter):
    """
    Token Bucket algorithm.
    Tokens are added at a fixed refill_rate up to a maximum capacity.
    Each request consumes one token.
    
    Inherits lock sharding from RateLimiter for thread-safe access to client buckets.
    """
    def __init__(self, capacity: int, refill_rate: float):
        super().__init__()
        self._capacity = capacity
        self._refill_rate = refill_rate
        self._client_states: Dict[str, List[float]] = {}

    def _cleanup_client(self, client_id: str):
        self._client_states.pop(client_id, None)

    def is_allowed(self, client_id: str) -> bool:
        return self.try_acquire(client_id).allowed

    def try_acquire(self, client_id: str) -> RateLimitResult:
        shard = self._get_shard(client_id)
        with shard:
            now = time.monotonic()
            unix_now = time.time()
            self._last_access[client_id] = unix_now
            
            state = self._client_states.get(client_id, [float(self._capacity), now])
            tokens, last_update = state
            
            elapsed = now - last_update
            tokens = min(float(self._capacity), tokens + (elapsed * self._refill_rate))
            
            allowed = tokens >= 1.0
            if allowed:
                tokens -= 1.0
            
            self._client_states[client_id] = [tokens, now]
            remaining = int(math.floor(tokens))
            retry_after = (1.0 - tokens) / self._refill_rate if not allowed else 0.0
            reset_at = unix_now + retry_after if not allowed else unix_now
            
            return RateLimitResult(allowed, remaining, self._capacity, reset_at, retry_after)

    @property
    def algorithm_name(self) -> str: return "token_bucket"

    @property
    def current_config(self) -> Dict[str, Any]:
        return {"algorithm": "token_bucket", "capacity": self._capacity, "refill_rate": self._refill_rate}

class SlidingWindowLogLimiter(RateLimiter):
    """
    Sliding Window Log algorithm.
    Maintains a log of timestamps for each client request within the window_size.
    Provides precise rate limiting but has higher memory cost per client (O(limit)).
    
    Inherits lock sharding from RateLimiter for thread-safe log manipulation.
    """
    def __init__(self, limit: int, window_size: float):
        super().__init__()
        self._limit = limit
        self._window_size = window_size
        self._client_logs: Dict[str, Deque[float]] = {}

    def _cleanup_client(self, client_id: str):
        self._client_logs.pop(client_id, None)

    def is_allowed(self, client_id: str) -> bool:
        return self.try_acquire(client_id).allowed

    def try_acquire(self, client_id: str) -> RateLimitResult:
        shard = self._get_shard(client_id)
        with shard:
            now = time.monotonic()
            unix_now = time.time()
            self._last_access[client_id] = unix_now
            
            log = self._client_logs.setdefault(client_id, deque())
            while log and log[0] <= now - self._window_size:
                log.popleft()
            
            allowed = len(log) < self._limit
            if allowed:
                log.append(now)
            
            remaining = self._limit - len(log)
            oldest = log[0] if log else now
            reset_at = unix_now + (oldest + self._window_size - now)
            retry_after = max(0.0, oldest + self._window_size - now) if not allowed else 0.0

            return RateLimitResult(allowed, remaining, self._limit, reset_at, retry_after)

    @property
    def algorithm_name(self) -> str: return "sliding_window"

    @property
    def current_config(self) -> Dict[str, Any]:
        return {"algorithm": "sliding_window", "limit": self._limit, "window_size": self._window_size}

class FixedWindowLimiter(RateLimiter):
    """
    Fixed Window Counters (with optional sliding approximation).
    Counts requests in fixed time windows. Sliding approximation uses a weighted 
    average of the current and previous window to smooth out burstiness at window boundaries.
    
    Inherits lock sharding from RateLimiter for thread-safe counter updates.
    """
    def __init__(self, limit: int, window_size: float, use_sliding_approximation: bool = False):
        super().__init__()
        self._limit = limit
        self._window_size = window_size
        self._use_sliding_approximation = use_sliding_approximation
        self._client_states: Dict[str, List[Union[float, int]]] = {}

    def _cleanup_client(self, client_id: str):
        self._client_states.pop(client_id, None)

    def is_allowed(self, client_id: str) -> bool:
        return self.try_acquire(client_id).allowed

    def try_acquire(self, client_id: str) -> RateLimitResult:
        shard = self._get_shard(client_id)
        with shard:
            now = time.time()
            self._last_access[client_id] = now
            window_start = math.floor(now / self._window_size) * self._window_size
            
            state = self._client_states.get(client_id, [window_start, 0, 0])
            w_start, count, prev_count = state
            
            if w_start != window_start:
                prev_count = count if w_start == window_start - self._window_size else 0
                count = 0
                w_start = window_start
            
            effective_count = count
            if self._use_sliding_approximation:
                ratio = (now - window_start) / self._window_size
                effective_count = prev_count * (1 - ratio) + count
            
            allowed = effective_count < self._limit
            if allowed:
                count += 1
                effective_count += 1
            
            self._client_states[client_id] = [w_start, count, prev_count]
            remaining = int(max(0, self._limit - math.floor(effective_count)))
            reset_at = window_start + self._window_size
            retry_after = max(0.0, reset_at - now) if not allowed else 0.0
            
            return RateLimitResult(allowed, remaining, self._limit, reset_at, retry_after)

    @property
    def algorithm_name(self) -> str: return "fixed_window"

    @property
    def current_config(self) -> Dict[str, Any]:
        return {"algorithm": "fixed_window", "limit": self._limit, "window_size": self._window_size, "sliding_approximation": self._use_sliding_approximation}

class RateLimiterFactory:
    @classmethod
    def create(cls, config: Dict[str, Any]) -> RateLimiter:
        if not isinstance(config, dict):
            raise ValueError(f"Config must be a dictionary, got {type(config).__name__}")
        
        algo = config.get("algorithm")
        if not algo:
            raise ValueError("Missing 'algorithm' key in config")
            
        if algo == "token_bucket":
            # Check required keys
            for key in ["capacity", "refill_rate"]:
                if key not in config:
                    raise ValueError(f"Missing required key '{key}' for token_bucket algorithm")
                if not isinstance(config[key], (int, float)):
                    raise ValueError(f"Invalid type for '{key}': expected int or float, got {type(config[key]).__name__}")
            return TokenBucketLimiter(int(config["capacity"]), float(config["refill_rate"]))
            
        if algo == "sliding_window":
            for key in ["limit", "window_size"]:
                if key not in config:
                    raise ValueError(f"Missing required key '{key}' for sliding_window algorithm")
                if not isinstance(config[key], (int, float)):
                    raise ValueError(f"Invalid type for '{key}': expected int or float, got {type(config[key]).__name__}")
            return SlidingWindowLogLimiter(int(config["limit"]), float(config["window_size"]))
            
        if algo == "fixed_window":
            for key in ["limit", "window_size"]:
                if key not in config:
                    raise ValueError(f"Missing required key '{key}' for fixed_window algorithm")
                if not isinstance(config[key], (int, float)):
                    raise ValueError(f"Invalid type for '{key}': expected int or float, got {type(config[key]).__name__}")
            
            sliding_approx = config.get("sliding_approximation", False)
            if not isinstance(sliding_approx, bool):
                 raise ValueError(f"Invalid type for 'sliding_approximation': expected bool, got {type(sliding_approx).__name__}")
                 
            return FixedWindowLimiter(int(config["limit"]), float(config["window_size"]), sliding_approx)
            
        raise ValueError(f"Unknown algorithm: {algo}")

    @classmethod
    def create_from_json(cls, filepath: str) -> Dict[str, RateLimiter]:
        with open(filepath, 'r') as f: data = json.load(f)
        return {name: cls.create(cfg) for name, cfg in data.get("limiters", {}).items()}

    @classmethod
    def create_from_yaml(cls, filepath: str) -> Dict[str, RateLimiter]:
        with open(filepath, 'r') as f: data = yaml.safe_load(f)
        return {name: cls.create(cfg) for name, cfg in data.get("limiters", {}).items()}

def rate_limit(limiter: RateLimiter, client_id_extractor: Callable):
    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            cid = client_id_extractor(args, kwargs)
            res = limiter.try_acquire(cid)
            if not res.allowed: raise RateLimitExceeded(res, cid, limiter.algorithm_name)
            return await func(*args, **kwargs)
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            cid = client_id_extractor(args, kwargs)
            res = limiter.try_acquire(cid)
            if not res.allowed: raise RateLimitExceeded(res, cid, limiter.algorithm_name)
            return func(*args, **kwargs)
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

class RateLimitContext:
    def __init__(self, limiter: RateLimiter, client_id: str):
        self.limiter, self.client_id, self.result = limiter, client_id, None
    def __enter__(self) -> RateLimitResult:
        self.result = self.limiter.try_acquire(self.client_id)
        if not self.result.allowed: raise RateLimitExceeded(self.result, self.client_id, self.limiter.algorithm_name)
        return self.result
    def __exit__(self, exc_type, exc_val, exc_tb): pass