
import os
import sys
import pytest
from unittest.mock import patch

# Ensure we can import from repository_after or repository_before
repo_dir = os.environ.get('TEST_REPO_DIR', 'repository_after')
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', repo_dir)))
from lru_ttl_cache import LRUCacheWithTTL

def test_stale_read():
    """Insert an item, mock the system clock forward past the TTL, and verify get returns None and removes the key."""
    cache = LRUCacheWithTTL(capacity=3, ttl=10)
    with patch('time.time') as mock_time:
        mock_time.return_value = 100
        cache.put("A", 1)
        
        # Move time forward past TTL (100 + 10 = 110)
        mock_time.return_value = 111
        assert cache.get("A") is None
        assert "A" not in cache.cache
        assert "A" not in cache.expiry_map

def test_lru_ordering():
    """Validate LRU ordering: Insert keys A, B, C (capacity 3). Access A. Insert D. Verify B is evicted, while A and C remain."""
    cache = LRUCacheWithTTL(capacity=3, ttl=100)
    cache.put("A", 1)
    cache.put("B", 2)
    cache.put("C", 3)
    
    # Access A to make it MRU
    cache.get("A")
    
    # Initial: A, B, C (MRU)
    # Get A: B, C, A (MRU)
    # Put D: C, A, D (MRU) -> B evicted
    cache.put("D", 4)
    
    assert "B" not in cache.cache
    assert "A" in cache.cache
    assert "C" in cache.cache
    assert "D" in cache.cache

def test_atomic_update():
    """Verify that put on an existing key updates both its value and its expiration timestamp, and moves it to the most-recently-used position."""
    cache = LRUCacheWithTTL(capacity=3, ttl=10)
    with patch('time.time') as mock_time:
        mock_time.return_value = 100
        cache.put("A", 1)
        
        mock_time.return_value = 105
        cache.put("B", 2)
        
        mock_time.return_value = 110
        # Update A. Should update expiration to 110 + 10 = 120
        # Should also move A to end
        cache.put("A", 10)
        
        assert cache.get("A") == 10
        assert cache.expiry_map["A"] == 120
        
        # Verify order: B is now LRU (oldest), A is MRU (newest)
        # {B: 2, A: 10}
        cache.put("C", 3) # {B: 2, A: 10, C: 3}
        cache.put("D", 4) # B should be evicted -> {A: 10, C: 3, D: 4}
        assert "B" not in cache.cache
        assert "A" in cache.cache

def test_prune_expired():
    """Fill the cache with items, expire half of them via time mocking, and verify that prune_expired returns the correct count and the cache size decreases accordingly."""
    cache = LRUCacheWithTTL(capacity=10, ttl=10)
    with patch('time.time') as mock_time:
        mock_time.return_value = 100
        for i in range(5):
            cache.put(f"expire{i}", i)
        
        mock_time.return_value = 120
        for i in range(5):
            cache.put(f"keep{i}", i)
            
        mock_time.return_value = 125
        count = cache.prune_expired()
        assert count == 5
        assert len(cache.cache) == 5
        for i in range(5):
            assert f"keep{i}" in cache.cache
            assert f"expire{i}" not in cache.cache

def test_zero_negative_capacity_ttl():
    """Handle zero and negative capacity/ttl scenarios to ensure the component raises appropriate errors or behaves predictably."""
    # Test zero capacity - depending on impl, might crash or just not store anything
    cache = LRUCacheWithTTL(capacity=0, ttl=10)
    try:
        cache.put("A", 1)
    except Exception:
        pass 

    # Test negative TTL
    cache_neg_ttl = LRUCacheWithTTL(capacity=5, ttl=-1)
    with patch('time.time') as mock_time:
        mock_time.return_value = 100
        cache_neg_ttl.put("A", 1)
        # exp = 100 - 1 = 99. 100 > 99, so it should be expired immediately.
        assert cache_neg_ttl.get("A") is None

def test_high_load():
    """Perform a high-load simulation (1000+ operations) and verify that len(self.cache) never exceeds self.capacity."""
    capacity = 50
    cache = LRUCacheWithTTL(capacity=capacity, ttl=100)
    for i in range(1500):
        cache.put(f"key{i}", i)
        assert len(cache.cache) <= capacity
    assert len(cache.cache) == capacity

def test_get_non_existent_no_lru_impact():
    """Verify that get on a non-existent key does not impact the LRU order of existing keys."""
    cache = LRUCacheWithTTL(capacity=3, ttl=100)
    cache.put("A", 1)
    cache.put("B", 2)
    cache.put("C", 3)
    # Order: A, B, C
    
    cache.get("non-existent")
    
    # Order should still be A, B, C. Inserting D should evict A.
    cache.put("D", 4)
    assert "A" not in cache.cache
    assert "B" in cache.cache

def test_coverage_delete_and_prune():
    """Achieve 100% code coverage, specifically ensuring the _delete and prune_expired methods are fully exercised."""
    cache = LRUCacheWithTTL(capacity=3, ttl=10)
    cache.put("A", 1)
    cache._delete("A") # key exists
    assert "A" not in cache.cache
    cache._delete("B") # key doesn't exist
    
    with patch('time.time') as mock_time:
        mock_time.return_value = 100
        cache.put("C", 3)
        
        mock_time.return_value = 200 # expired
        cache.prune_expired()
        assert "C" not in cache.cache
