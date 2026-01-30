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

def test_factory_validation():
    # Unknown algorithm
    with pytest.raises(ValueError, match="Unknown algorithm"):
        RateLimiterFactory.create({"algorithm": "magic"})
    
    # Missing algorithm key
    with pytest.raises(ValueError, match="Missing 'algorithm' key"):
        RateLimiterFactory.create({"capacity": 10})
        
    # Missing required keys
    with pytest.raises(ValueError, match="Missing required key 'capacity'"):
        RateLimiterFactory.create({"algorithm": "token_bucket", "refill_rate": 1.0})
        
    # Invalid types
    with pytest.raises(ValueError, match="Invalid type for 'capacity'"):
        RateLimiterFactory.create({"algorithm": "token_bucket", "capacity": "ten", "refill_rate": 1.0})
    
    # Invalid config type
    with pytest.raises(ValueError, match="Config must be a dictionary"):
        RateLimiterFactory.create(["not", "a", "dict"])

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

def test_token_bucket_capacity_cap():
    """Verify that tokens are capped at capacity even after long idle period."""
    limiter = TokenBucketLimiter(capacity=5, refill_rate=100.0)
    client_id = "idle_user"
    
    # Fill up
    time.sleep(0.1)
    
    # Try to take 10 - should only allow 5
    allowed_count = 0
    for _ in range(10):
        if limiter.is_allowed(client_id):
            allowed_count += 1
    assert allowed_count == 5

def test_fixed_window_clock_alignment():
    """Verify windows align to clock boundaries (floor(t/size)*size)."""
    window_size = 60.0
    limiter = FixedWindowLimiter(limit=10, window_size=window_size)
    client_id = "clock_user"
    
    now = time.time()
    expected_start = (now // window_size) * window_size
    
    result = limiter.try_acquire(client_id)
    # reset_at should be window_start + window_size
    assert result.reset_at == expected_start + window_size

def test_rate_limit_exceeded_attributes():
    """Verify RateLimitExceeded has all required attributes."""
    limiter = TokenBucketLimiter(capacity=0, refill_rate=1.0)
    client_id = "blocked_user"
    
    try:
        with RateLimitContext(limiter, client_id):
            pass
    except RateLimitExceeded as e:
        assert e.client_id == client_id
        assert e.limiter_name == "token_bucket"
        assert hasattr(e.limit_result, "allowed")
        assert e.limit_result.allowed is False

def test_sync_decorator():
    """Verify the rate_limit decorator works with synchronous functions."""
    limiter = TokenBucketLimiter(capacity=1, refill_rate=0.1)
    
    @rate_limit(limiter, lambda args, kwargs: args[0])
    def sync_func(user_id):
        return "ok"
    
    assert sync_func("user_sync") == "ok"
    with pytest.raises(RateLimitExceeded):
        sync_func("user_sync")

def test_factory_file_loaders(tmp_path):
    """Verify create_from_json and create_from_yaml."""
    json_data = {
        "limiters": {
            "api_default": {
                "algorithm": "token_bucket",
                "capacity": 100,
                "refill_rate": 10
            }
        }
    }
    yaml_data = {
        "limiters": {
            "login": {
                "algorithm": "fixed_window",
                "limit": 5,
                "window_size": 60
            }
        }
    }
    
    json_file = tmp_path / "test.json"
    yaml_file = tmp_path / "test.yaml"
    
    import json as json_lib
    import yaml as yaml_lib
    
    json_file.write_text(json_lib.dumps(json_data))
    yaml_file.write_text(yaml_lib.dump(yaml_data))
    
    # JSON
    limiters_json = RateLimiterFactory.create_from_json(str(json_file))
    assert "api_default" in limiters_json
    assert isinstance(limiters_json["api_default"], TokenBucketLimiter)
    
    # YAML
    limiters_yaml = RateLimiterFactory.create_from_yaml(str(yaml_file))
    assert "login" in limiters_yaml
    assert isinstance(limiters_yaml["login"], FixedWindowLimiter)

def test_from_config_class_method():
    """Verify RateLimiter.from_config works."""
    config = {"algorithm": "sliding_window", "limit": 10, "window_size": 1.0}
    limiter = SlidingWindowLogLimiter.from_config(config)
    assert isinstance(limiter, SlidingWindowLogLimiter)
    assert limiter.current_config["algorithm"] == "sliding_window"

def test_limiter_properties():
    """Verify algorithm_name and current_config for all limiters."""
    tb = TokenBucketLimiter(5, 1.0)
    assert tb.algorithm_name == "token_bucket"
    assert tb.current_config["capacity"] == 5
    
    sw = SlidingWindowLogLimiter(10, 60.0)
    assert sw.algorithm_name == "sliding_window"
    assert sw.current_config["limit"] == 10
    
    fw = FixedWindowLimiter(20, 30.0, use_sliding_approximation=True)
    assert fw.algorithm_name == "fixed_window"
    assert fw.current_config["sliding_approximation"] is True

def test_retry_after_token_bucket():
    """Verify retry_after accuracy for Token Bucket."""
    refill_rate = 2.0 # 0.5s per token
    limiter = TokenBucketLimiter(capacity=1, refill_rate=refill_rate)
    client_id = "retry_user"
    
    limiter.try_acquire(client_id) # Consume the only token
    result = limiter.try_acquire(client_id)
    
    assert result.allowed is False
    # Next token available in 1/refill_rate = 0.5s
    assert 0.4 <= result.retry_after <= 0.6

def test_retry_after_sliding_window():
    """Verify retry_after accuracy for Sliding Window Log."""
    window_size = 1.0
    limiter = SlidingWindowLogLimiter(limit=1, window_size=window_size)
    client_id = "retry_sw"
    
    limiter.try_acquire(client_id)
    time.sleep(0.2)
    result = limiter.try_acquire(client_id)
    
    assert result.allowed is False
    # Should be roughly window_size - elapsed = 0.8
    assert 0.7 <= result.retry_after <= 0.9

def test_memory_plateau():
    """Verifies that the janitor prunes stale client data from internal state."""
    limiter = TokenBucketLimiter(capacity=100, refill_rate=10.0)
    limiter._ttl = 0.5  # Set short TTL
    
    # Simulate an attack with many unique IDs
    for i in range(1000):
        limiter.is_allowed(str(uuid.uuid4()))

    time.sleep(1.0) # Wait for janitor
    
    # Registry should be pruned
    active_clients = len(limiter._last_access)
    assert active_clients < 1000

def test_lock_throughput():
    """Verify sharding prevents massive contention."""
    limiter = FixedWindowLimiter(limit=1000, window_size=60)
    
    def worker():
        for _ in range(200):
            limiter.is_allowed(str(uuid.uuid4()))

    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=20) as executor:
        for _ in range(10):
            executor.submit(worker)
            
    duration = time.perf_counter() - start
    assert duration < 2.0

def test_heavy_concurrency_multi_client():
    """Validates 10 threads each making 1000 requests for 100 different clients."""
    limiter = TokenBucketLimiter(capacity=100000, refill_rate=10000.0)
    num_threads = 10
    requests_per_thread = 1000
    num_clients = 100
    
    clients = [f"client_{i}" for i in range(num_clients)]
    
    def worker():
        for i in range(requests_per_thread):
            client_id = clients[i % num_clients]
            limiter.is_allowed(client_id)

    threads = [threading.Thread(target=worker) for _ in range(num_threads)]
    for t in threads: t.start()
    for t in threads: t.join()
            
    # Total tokens consumed = 10 * 1000 = 10,000
    # Each client (100 total) should have consumed exactly 100 tokens
    for client_id in clients:
        res = limiter.try_acquire(client_id)
        # 100000 - 100 + a bit of refill
        assert 99800 <= res.remaining <= 100000

if __name__ == "__main__":
    pytest.main([__file__])
