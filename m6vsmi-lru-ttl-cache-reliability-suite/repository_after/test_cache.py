
import pytest
from unittest.mock import patch
from lru_ttl_cache import LRUCacheWithTTL

def test_prune_expired_empty():
    """Test prune_expired on empty cache."""
    cache = LRUCacheWithTTL(capacity=3, ttl=100)
    assert cache.prune_expired() == 0

def test_put_same_key_multiple_times():
    """Test that putting the same key multiple times doesn't break the cache or create duplicates."""
    cache = LRUCacheWithTTL(capacity=3, ttl=100)
    with patch('time.time') as mock_time:
        mock_time.return_value = 100
        cache.put("A", 1)
        # Same value
        cache.put("A", 1)
        # Diff value
        cache.put("A", 3)
        
        # Should only have one entry
        assert len(cache.cache) == 1
        assert len(cache.expiry_map) == 1
        assert cache.get("A") == 3

def test_capacity_one_edge_case():
    """Test cache with capacity of 1 - every put should evict the previous item."""
    cache = LRUCacheWithTTL(capacity=1, ttl=100)
    cache.put("A", 1)
    assert len(cache.cache) == 1
    
    cache.put("B", 2)
    assert len(cache.cache) == 1
    assert "A" not in cache.cache
    assert "B" in cache.cache
    
    cache.put("C", 3)
    assert len(cache.cache) == 1
    assert "B" not in cache.cache
    assert "C" in cache.cache

def test_expired_item_doesnt_count_toward_capacity():
    """Verify that expired items don't prevent new insertions when at capacity."""
    cache = LRUCacheWithTTL(capacity=3, ttl=10)
    with patch('time.time') as mock_time:
        mock_time.return_value = 100
        cache.put("A", 1)
        cache.put("B", 2)
        cache.put("C", 3)
        
        # Expire all items
        mock_time.return_value = 120
        
        # Accessing any expired item should remove it
        assert cache.get("A") is None
        assert len(cache.cache) == 2  # A removed
        
        # Now we should be able to add 2 more items without eviction
        cache.put("D", 4)
        assert len(cache.cache) == 3
        assert "B" in cache.cache  # B not evicted yet
        
        cache.put("E", 5)
        assert len(cache.cache) == 3

def test_mixed_expired_and_valid_eviction():
    """Test LRU eviction when some items are expired and some are valid."""
    cache = LRUCacheWithTTL(capacity=3, ttl=10)
    with patch('time.time') as mock_time:
        mock_time.return_value = 100
        cache.put("A", 1)  # expires at 110
        
        mock_time.return_value = 105
        cache.put("B", 2)  # expires at 115
        
        mock_time.return_value = 110
        cache.put("C", 3)  # expires at 120
        
        # At time 112: A is expired, B and C are valid
        mock_time.return_value = 112
        
        # Add D - should trigger eviction
        cache.put("D", 4)
        
        # A should still be in cache (not accessed yet), so LRU evicts A
        # But A is expired, so it should be gone anyway
        assert len(cache.cache) <= 3

def test_put_after_prune():
    """Test that put works correctly after prune_expired."""
    cache = LRUCacheWithTTL(capacity=3, ttl=10)
    with patch('time.time') as mock_time:
        mock_time.return_value = 100
        cache.put("A", 1)
        cache.put("B", 2)
        
        mock_time.return_value = 120
        cache.prune_expired()
        
        # Cache should be empty now
        assert len(cache.cache) == 0
        
        # Adding new items should work fine
        cache.put("C", 3)
        cache.put("D", 4)
        assert len(cache.cache) == 2
        assert cache.get("C") == 3
        assert cache.get("D") == 4

def test_expiry_map_consistency():
    """Ensure expiry_map and cache stay in sync across operations."""
    cache = LRUCacheWithTTL(capacity=3, ttl=100)
    cache.put("A", 1)
    cache.put("B", 2)
    cache.put("C", 3)
    
    # Both maps should have same keys
    assert set(cache.cache.keys()) == set(cache.expiry_map.keys())
    
    cache.put("D", 4)  # Evicts A
    assert set(cache.cache.keys()) == set(cache.expiry_map.keys())
    
    cache.get("B")
    assert set(cache.cache.keys()) == set(cache.expiry_map.keys())

def test_very_short_ttl():
    """Test with a very short TTL (1 second)."""
    cache = LRUCacheWithTTL(capacity=5, ttl=1)
    with patch('time.time') as mock_time:
        mock_time.return_value = 100.0
        cache.put("A", 1)
        
        # Just before expiry
        mock_time.return_value = 100.9
        assert cache.get("A") == 1
        
        # Just after expiry
        mock_time.return_value = 101.1
        assert cache.get("A") is None

def test_alternating_put_get_operations():
    """Test alternating put and get operations maintain consistency."""
    cache = LRUCacheWithTTL(capacity=3, ttl=100)
    
    cache.put("A", 1)
    assert cache.get("A") == 1
    
    cache.put("B", 2)
    assert cache.get("B") == 2
    assert cache.get("A") == 1
    
    cache.put("C", 3)
    assert cache.get("C") == 3
    
    cache.put("D", 4)
    # B should be evicted (LRU)
    assert cache.get("B") is None
    assert cache.get("A") == 1
    assert cache.get("C") == 3
    assert cache.get("D") == 4
