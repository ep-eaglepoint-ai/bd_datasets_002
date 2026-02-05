from __future__ import annotations


def test_stats_hits_and_misses_increment_correctly(cache):
    cache.set("a", 1)
    before = cache.stats()

    assert cache.get("a") == 1
    assert cache.get("missing") is None

    after = cache.stats()
    assert after["hits"] == before["hits"] + 1
    assert after["misses"] == before["misses"] + 1


def test_stats_size_matches_internal_size(cache):
    cache.set("a", 1)
    cache.set("b", 2)
    assert cache.stats()["size"] == 2
    cache.delete("a")
    assert cache.stats()["size"] == 1


def test_keys_pattern_matching_star_and_question(cache):
    cache.set("user:1", "a")
    cache.set("user:2", "b")
    cache.set("user:10", "c")
    cache.set("key1", "x")
    cache.set("key2", "y")
    cache.set("key10", "z")

    assert sorted(cache.keys("user:*")) == ["user:1", "user:10", "user:2"]
    assert sorted(cache.keys("key?")) == ["key1", "key2"]


def test_keys_empty_pattern_returns_empty_list(cache):
    cache.set("a", 1)
    assert cache.keys("") == []


def test_delete_pattern_deletes_only_matches_and_returns_count(cache):
    cache.set("user:1", 1)
    cache.set("user:2", 2)
    cache.set("other:1", 3)

    deleted = cache.delete_pattern("user:*")
    assert deleted == 2
    assert cache.exists("user:1") is False
    assert cache.exists("user:2") is False
    assert cache.exists("other:1") is True


def test_stats_evictions_counter_accuracy(cache):
    """Test that evictions counter is accurate"""
    from repository_before.cache import DistributedCache
    small_cache = DistributedCache(max_size=2)
    try:
        small_cache.set("a", 1)
        small_cache.set("b", 2)
        initial_evictions = small_cache.stats()["evictions"]
        
        small_cache.set("c", 3)  # Should evict "a"
        assert small_cache.stats()["evictions"] == initial_evictions + 1
        
        small_cache.set("d", 4)  # Should evict "b"
        assert small_cache.stats()["evictions"] == initial_evictions + 2
    finally:
        if hasattr(small_cache, "close"):
            small_cache.close()


def test_stats_size_reflects_internal_storage(cache):
    """Test that size accurately reflects internal storage"""
    assert cache.stats()["size"] == 0
    
    cache.set("a", 1)
    assert cache.stats()["size"] == 1
    
    cache.set("b", 2)
    assert cache.stats()["size"] == 2
    
    cache.delete("a")
    assert cache.stats()["size"] == 1
    
    cache.delete("b")
    assert cache.stats()["size"] == 0


def test_stats_misses_increment_on_expired_key_access(cache):
    """Test that accessing expired key increments miss counter"""
    from datetime import datetime, timedelta, timezone
    from freezegun import freeze_time
    
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=1)
        initial_misses = cache.stats()["misses"]
        
        frozen.move_to(base + timedelta(seconds=2))
        cache.get("k")  # Should be None and increment miss
        
        assert cache.stats()["misses"] == initial_misses + 1


def test_stats_clear_resets_all_counters(cache):
    """Test that clear() resets all counters to 0"""
    cache.set("a", 1)
    cache.get("a")  # hit
    cache.get("missing")  # miss
    
    from repository_before.cache import DistributedCache
    small_cache = DistributedCache(max_size=1)
    try:
        small_cache.set("a", 1)
        small_cache.set("b", 2)  # eviction
    finally:
        if hasattr(small_cache, "close"):
            small_cache.close()
    
    cache.clear()
    stats = cache.stats()
    assert stats["hits"] == 0
    assert stats["misses"] == 0
    assert stats["evictions"] == 0
    assert stats["size"] == 0


def test_stats_accurate_under_mixed_operations(cache):
    """Test stats accuracy under mixed operations"""
    initial_stats = cache.stats()
    
    cache.set("a", 1)
    cache.get("a")  # hit
    cache.get("a")  # hit
    cache.get("missing")  # miss
    cache.delete("a")
    cache.get("a")  # miss (deleted)
    
    stats = cache.stats()
    assert stats["hits"] == initial_stats["hits"] + 2
    assert stats["misses"] == initial_stats["misses"] + 2
    assert stats["size"] == 0


def test_keys_pattern_with_special_characters(cache):
    """Test pattern matching with special characters"""
    cache.set("key:with:colons", 1)
    cache.set("key.with.dots", 2)
    cache.set("key-with-dashes", 3)
    cache.set("key_with_underscores", 4)
    
    assert "key:with:colons" in cache.keys("key:*")
    assert "key.with.dots" in cache.keys("key.*")
    assert "key-with-dashes" in cache.keys("key-*")
    assert "key_with_underscores" in cache.keys("key_*")


def test_keys_pattern_with_question_mark_edge_cases(cache):
    """Test pattern matching with question mark wildcard"""
    cache.set("key1", 1)
    cache.set("key2", 2)
    cache.set("key10", 10)
    cache.set("key", 0)
    cache.set("keys", 3)
    
    results = sorted(cache.keys("key?"))
    assert "key1" in results
    assert "key2" in results
    assert "key10" not in results  # "?" matches exactly one character
    assert "key" not in results  # "?" requires a character
    assert "keys" not in results  # "?" matches one char, not multiple


def test_keys_pattern_no_matches_returns_empty_list(cache):
    """Test that keys() with no matches returns empty list"""
    cache.set("user:1", 1)
    cache.set("user:2", 2)
    
    assert cache.keys("nonexistent:*") == []
    assert cache.keys("user:999") == []


def test_delete_pattern_with_no_matches_returns_zero(cache):
    """Test delete_pattern with no matches returns 0"""
    cache.set("user:1", 1)
    
    deleted = cache.delete_pattern("nonexistent:*")
    assert deleted == 0
    assert cache.exists("user:1") is True


def test_delete_pattern_with_empty_pattern(cache):
    """Test delete_pattern with empty pattern"""
    cache.set("a", 1)
    cache.set("b", 2)
    
    deleted = cache.delete_pattern("")
    assert deleted == 0  # Empty pattern matches nothing
    assert cache.exists("a") is True
    assert cache.exists("b") is True


def test_keys_pattern_star_matches_all(cache):
    """Test that * pattern matches all keys"""
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    
    all_keys = sorted(cache.keys("*"))
    assert all_keys == ["a", "b", "c"]


def test_keys_pattern_complex_patterns(cache):
    """Test complex pattern matching scenarios"""
    cache.set("user:1:profile", 1)
    cache.set("user:2:profile", 2)
    cache.set("user:10:profile", 10)
    cache.set("user:1:settings", 3)
    cache.set("admin:1:profile", 4)
    
    # Match all user profiles
    user_profiles = sorted(cache.keys("user:*:profile"))
    assert "user:1:profile" in user_profiles
    assert "user:2:profile" in user_profiles
    assert "user:10:profile" in user_profiles
    assert "admin:1:profile" not in user_profiles
    
    # Match user:1:* (all user:1 keys)
    user1_keys = sorted(cache.keys("user:1:*"))
    assert "user:1:profile" in user1_keys
    assert "user:1:settings" in user1_keys

