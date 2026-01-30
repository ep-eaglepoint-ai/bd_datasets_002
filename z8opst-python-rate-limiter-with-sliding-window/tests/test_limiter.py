import time
import pytest
import threading
import math
from unittest.mock import patch

# These imports will work because we set PYTHONPATH in the Docker command
from limiter import RateLimiter
from types_limiter import RateLimiterConfig, AlgorithmType

# Validation ---
def test_config_validation():
    with pytest.raises(ValueError, match="positive"):
        RateLimiterConfig(algorithm=AlgorithmType.FIXED, window_size_seconds=0)

# Fixed Window Boundaries ---
def test_fixed_window_boundaries():
    config = RateLimiterConfig(AlgorithmType.FIXED, window_size_seconds=10, requests_per_window=1)
    limiter = RateLimiter(config)
    
    # 11:59:59.999
    with patch('time.time', return_value=9.999):
        assert limiter.is_allowed("u1") is True
        assert limiter.is_allowed("u1") is False 
        
    # 12:00:00.001 (New Window)
    with patch('time.time', return_value=10.001):
        assert limiter.is_allowed("u1") is True

# Sliding Log Memory Cleanup ---
def test_sliding_log_automatic_cleanup():
    # Use 0.1s window
    config = RateLimiterConfig(AlgorithmType.SLIDING_LOG, window_size_seconds=0.1, requests_per_window=10)
    from storage import InMemoryStorage
    # Set cleanup interval to be very aggressive for the test
    storage = InMemoryStorage(cleanup_interval=0.05)
    limiter = RateLimiter(config, storage=storage)

    limiter.is_allowed("expiring_user")
    assert "expiring_user" in storage._data

    # Wait for the TTL (0.1s) + cleanup interval (0.05s) + buffer
    time.sleep(0.3) 
    assert "expiring_user" not in storage._data
    
# Sliding Counter Weighting ---
def test_sliding_counter_weighting():
    config = RateLimiterConfig(AlgorithmType.SLIDING_COUNTER, window_size_seconds=60, requests_per_window=100)
    limiter = RateLimiter(config)
    
    # Fill prev window with 100
    with patch('time.time', return_value=0):
        for _ in range(100): limiter.is_allowed("u1")
    
    # 30s into next window: weight = 0.5. Estimated = 100*0.5 + 0 = 50
    with patch('time.time', return_value=90): 
        assert limiter.get_remaining("u1") == 50

# --- Token Bucket Fractions ---
def test_token_bucket_fractional_refill():
    config = RateLimiterConfig(
        AlgorithmType.TOKEN_BUCKET, 
        bucket_capacity=2, 
        refill_rate=0.5 # 1 token every 2 seconds
    )
    limiter = RateLimiter(config)
    
    with patch('time.time', return_value=0):
        limiter.is_allowed("u1") # Consume 1
        limiter.is_allowed("u1") # Consume 1 (0 left)
        
    # After 3 seconds, refill 1.5 tokens. Total available: 1.5
    with patch('time.time', return_value=3.0):
        assert limiter.get_remaining("u1") == 1 
        assert limiter.is_allowed("u1") is True # 0.5 left
        assert limiter.is_allowed("u1") is False

#  Concurrency and Per-Key Locking ---
def test_concurrency_and_per_key_isolation():
    config = RateLimiterConfig(AlgorithmType.FIXED, window_size_seconds=60, requests_per_window=50)
    limiter = RateLimiter(config)
    
    # Atomic Check-and-Increment (Req 5)
    results = []
    def call(): results.append(limiter.is_allowed("shared"))
    
    threads = [threading.Thread(target=call) for _ in range(100)]
    for t in threads: t.start()
    for t in threads: t.join()
    
    assert results.count(True) == 50

# Real-time calculation ---
def test_get_reset_time_fixed():
    config = RateLimiterConfig(AlgorithmType.FIXED, window_size_seconds=60)
    limiter = RateLimiter(config)
    with patch('time.time', return_value=10):
        # Reset should be at 60s
        assert limiter.get_reset_time("u1") == 60