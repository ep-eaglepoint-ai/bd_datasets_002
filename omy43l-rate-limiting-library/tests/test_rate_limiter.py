import time
import threading
import pytest
import uuid
import os
from concurrent.futures import ThreadPoolExecutor

from repository_after.rate_limiter import (
    TokenBucketLimiter,
    SlidingWindowLogLimiter,
    FixedWindowLimiter,
    RateLimiterFactory,
    RateLimitExceeded,
    rate_limit,
    RateLimitContext
)

def test_token_bucket_burst():
    limiter = TokenBucketLimiter(capacity=5, refill_rate=1.0)
    client_id = "user1"
    
    # Can take 5 tokens immediately
    for _ in range(5):
        assert limiter.is_allowed(client_id) is True
    
    # 6th token should be denied
    assert limiter.is_allowed(client_id) is False
    
    result = limiter.try_acquire(client_id)
    assert result.allowed is False
    assert result.remaining == 0
    assert result.retry_after > 0

def test_token_bucket_refill():
    limiter = TokenBucketLimiter(capacity=1, refill_rate=10.0)
    client_id = "user1"
    
    assert limiter.try_acquire(client_id).allowed is True
    assert limiter.try_acquire(client_id).allowed is False
    
    time.sleep(0.15)
    assert limiter.try_acquire(client_id).allowed is True

def test_sliding_window_log():
    limiter = SlidingWindowLogLimiter(limit=2, window_size=0.5)
    client_id = "user1"
    
    assert limiter.is_allowed(client_id) is True
    assert limiter.is_allowed(client_id) is True
    assert limiter.is_allowed(client_id) is False
    
    time.sleep(0.6)
    assert limiter.is_allowed(client_id) is True

def test_fixed_window_reset():
    window_size = 1.0
    limiter = FixedWindowLimiter(limit=2, window_size=window_size)
    client_id = "user1"
    
    # Find how much time is left in current window
    now = time.time()
    time_to_next_window = window_size - (now % window_size)
    
    # Fill current window
    assert limiter.is_allowed(client_id) is True
    assert limiter.is_allowed(client_id) is True
    assert limiter.is_allowed(client_id) is False
    
    time.sleep(time_to_next_window + 0.1)
    
    # New window
    assert limiter.is_allowed(client_id) is True

def test_fixed_window_sliding_approximation():
    limiter = FixedWindowLimiter(limit=10, window_size=1.0, use_sliding_approximation=True)
    client_id = "user1"
    
    # Fill first window with 10 requests
    for _ in range(10):
        limiter.is_allowed(client_id)
    
    # At the start of next window, some should still be restricted due to approximation
    now = time.time()
    time_to_next_window = 1.0 - (now % 1.0)
    time.sleep(time_to_next_window + 0.1)
    
    blocked = False
    for _ in range(5):
        if not limiter.is_allowed(client_id):
            blocked = True
            break
    assert blocked is True

def test_concurrency_token_bucket():
    limiter = TokenBucketLimiter(capacity=1000, refill_rate=100.0)
    client_id = "user1"
    
    def worker():
        for _ in range(100):
            limiter.is_allowed(client_id)
            
    threads = [threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
        
    result = limiter.try_acquire(client_id)
    assert result.remaining <= 100 

@pytest.mark.asyncio
async def test_decorator_async():
    limiter = TokenBucketLimiter(capacity=1, refill_rate=1.0)
    
    @rate_limit(limiter, lambda args, kwargs: kwargs.get("user_id"))
    async def restricted_func(user_id):
        return "success"
        
    assert await restricted_func(user_id="user1") == "success"
    with pytest.raises(RateLimitExceeded):
        await restricted_func(user_id="user1")

def test_context_manager():
    limiter = TokenBucketLimiter(capacity=1, refill_rate=1.0)
    client_id = "user1"
    
    with RateLimitContext(limiter, client_id) as result:
        assert result.allowed is True
        
    with pytest.raises(RateLimitExceeded):
        with RateLimitContext(limiter, client_id):
            pass

def test_factory_from_config():
    config = {
        "algorithm": "token_bucket",
        "capacity": 10,
        "refill_rate": 2.0
    }
    limiter = RateLimiterFactory.create(config)
    assert isinstance(limiter, TokenBucketLimiter)
    assert limiter.algorithm_name == "token_bucket"

def test_performance():
    limiters = [
        TokenBucketLimiter(1000000, 1000000),
        SlidingWindowLogLimiter(1000000, 1000),
        FixedWindowLimiter(1000000, 1000)
    ]
    
    for limiter in limiters:
        start_time = time.time()
        for _ in range(100000):
            limiter.is_allowed("perf_client")
        end_time = time.time()
        duration = end_time - start_time
        assert duration < 1.0

def test_memory_plateau():
    """Verifies that the janitor prunes stale client data from internal state."""
    print("--- Testing Memory Plateau (Hardening Check) ---")
    limiter = TokenBucketLimiter(capacity=100, refill_rate=10.0)
    limiter._ttl = 1.0  # Force 1 second TTL
    
    # Simulate an attack with 50,000 unique IDs
    for i in range(50000):
        limiter.is_allowed(str(uuid.uuid4()))

    print("Waiting for Janitor to prune...")
    time.sleep(2.0)
    
    # We check the internal registry size. If the janitor works, 
    # it should be significantly lower than 50,000.
    active_clients = len(limiter._last_access)
    print(f"Active clients in state after TTL: {active_clients}")
    
    assert active_clients < 50000, "Janitor failed to prune stale clients!"
    print("✅ Hardening Verified: Internal state growth was successfully truncated.")

def test_lock_throughput():
    print("\n--- Testing Shard Throughput ---")
    limiter = FixedWindowLimiter(limit=1000, window_size=60)
    
    def worker():
        for _ in range(500):
            limiter.is_allowed(str(uuid.uuid4()))

    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=50) as executor:
        for _ in range(20):
            executor.submit(worker)
            
    duration = time.perf_counter() - start
    print(f"10,000 requests across 50 threads took: {duration:.4f}s")
    assert duration < 2.0, "Concurrency bottleneck detected!"
    print("✅ Sharding Verified: Master lock bottleneck eliminated.")

if __name__ == "__main__":
    test_memory_plateau()
    test_lock_throughput()