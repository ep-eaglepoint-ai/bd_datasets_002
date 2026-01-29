from __future__ import annotations


def test_lru_eviction_evicts_least_recently_used(small_cache):
    small_cache.set("a", 1)
    small_cache.set("b", 2)
    small_cache.set("c", 3)

    # Access "b" so it should not be evicted.
    assert small_cache.get("b") == 2

    before = small_cache.stats()
    small_cache.set("d", 4)
    after = small_cache.stats()

    assert small_cache.get("a") is None
    assert small_cache.get("b") == 2
    assert small_cache.get("c") == 3
    assert small_cache.get("d") == 4
    assert after["evictions"] == before["evictions"] + 1
    assert after["size"] <= 3


def test_set_updates_access_order_for_existing_key(small_cache):
    small_cache.set("a", 1)
    small_cache.set("b", 2)
    small_cache.set("c", 3)

    # Updating "a" via set should make it most-recent.
    small_cache.set("a", 10)
    small_cache.set("d", 4)

    assert small_cache.get("b") is None
    assert small_cache.get("a") == 10
    assert small_cache.get("c") == 3
    assert small_cache.get("d") == 4


def test_max_size_1_never_exceeds_capacity():
    from repository_before.cache import DistributedCache

    c = DistributedCache(max_size=1)
    try:
        c.set("a", 1)
        c.set("b", 2)
        assert c.stats()["size"] <= 1
        assert c.get("a") is None or c.get("b") is None
    finally:
        if hasattr(c, "close"):
            c.close()


def test_lru_eviction_counter_increments_exactly_one_per_eviction(small_cache):
    """Test that eviction counter increments by exactly 1 per eviction"""
    small_cache.set("a", 1)
    small_cache.set("b", 2)
    small_cache.set("c", 3)
    
    initial_evictions = small_cache.stats()["evictions"]
    
    # Adding "d" should evict exactly one entry
    small_cache.set("d", 4)
    assert small_cache.stats()["evictions"] == initial_evictions + 1
    
    # Adding "e" should evict exactly one more entry
    small_cache.set("e", 5)
    assert small_cache.stats()["evictions"] == initial_evictions + 2


def test_lru_eviction_with_multiple_operations(small_cache):
    """Test LRU eviction with multiple get/set operations"""
    small_cache.set("a", 1)
    small_cache.set("b", 2)
    small_cache.set("c", 3)
    
    # Access "a" to make it most recent
    small_cache.get("a")
    # Access "c" to make it most recent
    small_cache.get("c")
    
    # Now "b" should be least recently used
    small_cache.set("d", 4)
    assert small_cache.get("b") is None  # "b" should be evicted
    assert small_cache.get("a") == 1
    assert small_cache.get("c") == 3
    assert small_cache.get("d") == 4


def test_lru_eviction_get_updates_access_order(small_cache):
    """Test that get() updates access order for LRU"""
    small_cache.set("a", 1)
    small_cache.set("b", 2)
    small_cache.set("c", 3)
    
    # "a" is least recently used
    small_cache.get("a")  # Now "a" is most recently used
    
    # Adding "d" should evict "b" (not "a" or "c")
    small_cache.set("d", 4)
    assert small_cache.get("a") == 1
    assert small_cache.get("b") is None
    assert small_cache.get("c") == 3
    assert small_cache.get("d") == 4


def test_lru_eviction_set_updates_access_order(small_cache):
    """Test that set() updates access order for existing keys"""
    small_cache.set("a", 1)
    small_cache.set("b", 2)
    small_cache.set("c", 3)
    
    # Update "a" - this should make it most recent
    small_cache.set("a", 10)
    
    # Adding "d" should evict "b" (not "a" or "c")
    small_cache.set("d", 4)
    assert small_cache.get("a") == 10
    assert small_cache.get("b") is None
    assert small_cache.get("c") == 3
    assert small_cache.get("d") == 4


def test_lru_eviction_with_ttl_expired_entries(small_cache):
    """Test LRU eviction when some entries have expired TTL"""
    from datetime import datetime, timedelta, timezone
    from freezegun import freeze_time
    
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        small_cache.set("a", 1, ttl=5)
        small_cache.set("b", 2)
        small_cache.set("c", 3)
        
        # "a" expires
        frozen.move_to(base + timedelta(seconds=6))
        
        # Adding "d" should not evict anything if "a" is already expired
        # But if "a" is still in cache, it should be evicted first
        small_cache.set("d", 4)
        
        # "a" should be gone (expired or evicted)
        assert small_cache.get("a") is None
        assert small_cache.stats()["size"] <= 3


def test_lru_eviction_multiple_sequential_evictions(small_cache):
    """Test multiple sequential evictions"""
    small_cache.set("a", 1)
    small_cache.set("b", 2)
    small_cache.set("c", 3)
    
    evictions_before = small_cache.stats()["evictions"]
    
    # Add multiple keys, each should evict one
    small_cache.set("d", 4)
    assert small_cache.stats()["evictions"] == evictions_before + 1
    
    small_cache.set("e", 5)
    assert small_cache.stats()["evictions"] == evictions_before + 2
    
    small_cache.set("f", 6)
    assert small_cache.stats()["evictions"] == evictions_before + 3
    
    # Only last 3 keys should exist
    assert small_cache.get("a") is None
    assert small_cache.get("b") is None
    assert small_cache.get("c") is None
    assert small_cache.get("d") == 4
    assert small_cache.get("e") == 5
    assert small_cache.get("f") == 6


def test_lru_eviction_no_eviction_when_key_exists(small_cache):
    """Test that updating existing key doesn't cause eviction"""
    small_cache.set("a", 1)
    small_cache.set("b", 2)
    small_cache.set("c", 3)
    
    evictions_before = small_cache.stats()["evictions"]
    
    # Updating existing key should not cause eviction
    small_cache.set("a", 10)
    assert small_cache.stats()["evictions"] == evictions_before
    assert small_cache.stats()["size"] == 3

