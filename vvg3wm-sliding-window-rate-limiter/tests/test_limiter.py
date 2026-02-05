import pytest
import threading
import time
from limiter import RateLimiter

class MockTime:
    def __init__(self):
        self.now = 1000.0
    def __call__(self):
        return self.now
    def advance(self, seconds: float):
        self.now += seconds

def test_basic_limit_enforcement():
    """Verify True/False returns and independent tracking."""
    timer = MockTime()
    limiter = RateLimiter(max_requests=2, window_seconds=10, time_function=timer)
    
    assert limiter.is_allowed("user1") is True
    assert limiter.is_allowed("user1") is True
    assert limiter.is_allowed("user1") is False # Limit hit
    assert limiter.is_allowed("user2") is True  # Independent key

def test_sliding_window_logic():
    """Verify window slides and permits new requests after expiry."""
    timer = MockTime()
    limiter = RateLimiter(max_requests=1, window_seconds=10, time_function=timer)
    
    assert limiter.is_allowed("u1") is True
    assert limiter.is_allowed("u1") is False
    
    timer.advance(11) # Window has passed
    assert limiter.is_allowed("u1") is True

def test_get_remaining_and_reset():
    """Verify state inspection and manual reset."""
    limiter = RateLimiter(max_requests=5, window_seconds=60)
    limiter.is_allowed("u1")
    assert limiter.get_remaining("u1") == 4
    
    limiter.reset("u1")
    assert limiter.get_remaining("u1") == 5

def test_cleanup_removes_orphans():
    """Verify memory cleanup deletes empty keys."""
    timer = MockTime()
    limiter = RateLimiter(max_requests=10, window_seconds=10, time_function=timer)
    
    limiter.is_allowed("ghost")
    timer.advance(15)
    limiter.cleanup()
    
    assert "ghost" not in limiter._history

def test_thread_safety():
    """Stress test for race conditions."""
    limiter = RateLimiter(max_requests=50, window_seconds=60)
    results = []
    
    def worker():
        results.append(limiter.is_allowed("concurrent_user"))
        
    threads = [threading.Thread(target=worker) for _ in range(100)]
    for t in threads: t.start()
    for t in threads: t.join()
    
    assert results.count(True) == 50
    assert results.count(False) == 50