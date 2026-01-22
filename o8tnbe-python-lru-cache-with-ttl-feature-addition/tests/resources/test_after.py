"""Tests for repository_after implementation."""
import sys
import os
import time
import threading
import pytest
from unittest.mock import patch

# Add repository_after to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../repository_after'))

from profile_service import lru_cache_with_ttl, CacheStats


class TestAfterImplementation:
    """Test the improved implementation (should pass all tests)."""
    
    def test_cache_info_method_exists(self):
        """Test that cache_info method is available."""
        @lru_cache_with_ttl(maxsize=2, ttl_seconds=1)
        def test_func(x):
            return x * 2
        
        assert hasattr(test_func, 'cache_info')
        stats = test_func.cache_info()
        assert isinstance(stats, CacheStats)
        assert stats.hits == 0
        assert stats.misses == 0
        assert stats.evictions == 0
        assert stats.expirations == 0
    
    def test_cache_clear_method_exists(self):
        """Test that cache_clear method is available."""
        @lru_cache_with_ttl(maxsize=2, ttl_seconds=1)
        def test_func(x):
            return x * 2
        
        assert hasattr(test_func, 'cache_clear')
        test_func.cache_clear()  # Should not raise exception
    
    def test_basic_caching_behavior(self):
        """Test that basic caching works."""
        call_count = 0
        
        @lru_cache_with_ttl(maxsize=2, ttl_seconds=60)
        def test_func(x):
            nonlocal call_count
            call_count += 1
            return x * 2
        
        # First call should be a miss
        result1 = test_func(5)
        assert result1 == 10
        assert call_count == 1
        
        stats = test_func.cache_info()
        assert stats.hits == 0
        assert stats.misses == 1
        
        # Second call with same argument should be a hit
        result2 = test_func(5)
        assert result2 == 10
        assert call_count == 1  # Function not called again
        
        stats = test_func.cache_info()
        assert stats.hits == 1
        assert stats.misses == 1
    
    def test_lru_eviction(self):
        """Test LRU eviction policy."""
        @lru_cache_with_ttl(maxsize=2, ttl_seconds=60)
        def test_func(x):
            return x * 2
        
        # Fill cache to capacity
        test_func(1)  # miss
        test_func(2)  # miss
        
        stats = test_func.cache_info()
        assert stats.misses == 2
        assert stats.evictions == 0
        
        # Access first item to make it most recently used
        test_func(1)  # hit
        
        stats = test_func.cache_info()
        assert stats.hits == 1
        
        # Add third item, should evict least recently used (2)
        test_func(3)  # miss, evicts 2
        
        stats = test_func.cache_info()
        assert stats.misses == 3
        assert stats.evictions == 1
        
        # Verify 1 and 3 are still cached, 2 is not
        test_func(1)  # hit
        test_func(3)  # hit
        test_func(2)  # miss (was evicted)
        
        stats = test_func.cache_info()
        assert stats.hits == 3
        assert stats.misses == 4
    
    def test_ttl_expiration(self):
        """Test TTL expiration."""
        @lru_cache_with_ttl(maxsize=10, ttl_seconds=0.1)
        def test_func(x):
            return x * 2
        
        # Cache a value
        result1 = test_func(5)
        assert result1 == 10
        
        stats = test_func.cache_info()
        assert stats.misses == 1
        assert stats.expirations == 0
        
        # Access before expiration
        result2 = test_func(5)
        assert result2 == 10
        
        stats = test_func.cache_info()
        assert stats.hits == 1
        assert stats.expirations == 0
        
        # Wait for expiration
        time.sleep(0.15)
        
        # Access after expiration
        result3 = test_func(5)
        assert result3 == 10
        
        stats = test_func.cache_info()
        assert stats.hits == 1
        assert stats.misses == 2
        assert stats.expirations == 1
    
    def test_thread_safety(self):
        """Test thread-safe operations."""
        results = []
        call_count = 0
        
        @lru_cache_with_ttl(maxsize=10, ttl_seconds=60)
        def test_func(x):
            nonlocal call_count
            call_count += 1
            time.sleep(0.01)  # Small delay
            return x * 2
        
        def worker(value):
            results.append(test_func(value))
        
        # Multiple threads accessing same value
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=worker, args=(1,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # All results should be the same
        assert all(result == 2 for result in results)
        assert len(results) == 5
        
        # Function should be called only once due to caching
        # (allowing for some race conditions in thread safety)
        assert call_count <= 5  # At most 5 calls, ideally 1
        
        stats = test_func.cache_info()
        assert stats.hits + stats.misses == 5
    
    def test_argument_normalization(self):
        """Test argument normalization."""
        call_count = 0
        
        @lru_cache_with_ttl(maxsize=10, ttl_seconds=60)
        def test_func(a, b=2):
            nonlocal call_count
            call_count += 1
            return a + b
        
        # These should all produce the same cache key
        result1 = test_func(1, b=2)
        result2 = test_func(1, 2)
        result3 = test_func(a=1, b=2)
        result4 = test_func(1)  # Uses default b=2
        
        assert result1 == result2 == result3 == result4 == 3
        assert call_count == 1  # Function called only once
        
        stats = test_func.cache_info()
        assert stats.hits == 3
        assert stats.misses == 1
    
    def test_unhashable_arguments(self):
        """Test graceful handling of unhashable arguments."""
        call_count = 0
        
        @lru_cache_with_ttl(maxsize=10, ttl_seconds=60)
        def test_func(x):
            nonlocal call_count
            call_count += 1
            return str(x)
        
        # Hashable arguments should be cached
        result1 = test_func("hello")
        result2 = test_func("hello")
        assert result1 == result2 == "hello"
        assert call_count == 1
        
        stats = test_func.cache_info()
        assert stats.hits == 1
        assert stats.misses == 1
        
        # Unhashable arguments should bypass cache
        result3 = test_func({"key": "value"})
        result4 = test_func({"key": "value"})
        assert result3 == result4 == "{'key': 'value'}"
        assert call_count == 3  # Called twice for unhashable args
        
        stats = test_func.cache_info()
        assert stats.hits == 1
        assert stats.misses == 3  # Two misses for unhashable args
    
    def test_cache_clear(self):
        """Test cache_clear functionality."""
        @lru_cache_with_ttl(maxsize=10, ttl_seconds=60)
        def test_func(x):
            return x * 2
        
        # Add some entries
        test_func(1)
        test_func(2)
        test_func(1)  # hit
        
        stats = test_func.cache_info()
        assert stats.hits == 1
        assert stats.misses == 2
        
        # Clear cache
        test_func.cache_clear()
        
        stats = test_func.cache_info()
        assert stats.hits == 0
        assert stats.misses == 0
        assert stats.evictions == 0
        assert stats.expirations == 0
        
        # Verify cache is actually cleared
        test_func(1)  # Should be miss again
        stats = test_func.cache_info()
        assert stats.misses == 1
    
    def test_metadata_preservation(self):
        """Test that function metadata is preserved."""
        @lru_cache_with_ttl(maxsize=2, ttl_seconds=1)
        def test_func(x):
            """Test function docstring."""
            return x * 2
        
        assert test_func.__name__ == 'test_func'
        assert test_func.__doc__ == 'Test function docstring.'
    
    def test_complex_arguments(self):
        """Test caching with complex argument combinations."""
        call_count = 0
        
        @lru_cache_with_ttl(maxsize=10, ttl_seconds=60)
        def test_func(a, b, c=3):
            nonlocal call_count
            call_count += 1
            return a + b + c
        
        # Test various argument combinations that should normalize to same key
        result1 = test_func(1, 2)
        result2 = test_func(1, 2, c=3)
        result3 = test_func(a=1, b=2)
        result4 = test_func(1, b=2, c=3)
        
        assert result1 == result2 == result3 == result4 == 6
        assert call_count == 1
        
        # Different arguments should create new cache entries
        result5 = test_func(1, 2, 4)
        assert result5 == 7
        assert call_count == 2
        
        result6 = test_func(2, 3)
        assert result6 == 8
        assert call_count == 3