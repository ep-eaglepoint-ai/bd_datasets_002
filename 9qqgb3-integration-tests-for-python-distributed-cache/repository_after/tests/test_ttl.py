from __future__ import annotations

from datetime import datetime, timedelta, timezone

from freezegun import freeze_time


def test_key_without_ttl_never_expires(cache):
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=None)
        frozen.move_to(base + timedelta(days=365))
        assert cache.get("k") == "v"


def test_ttl_precision_to_the_second(cache):
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=10)

        frozen.move_to(base + timedelta(seconds=9, milliseconds=900))
        assert cache.get("k") == "v"

        frozen.move_to(base + timedelta(seconds=10))
        assert cache.get("k") is None


def test_get_on_expired_key_removes_entry_and_increments_miss(cache):
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=1)

        frozen.move_to(base + timedelta(seconds=2))
        before = cache.stats()
        assert cache.get("k") is None
        after = cache.stats()

        assert after["misses"] == before["misses"] + 1
        assert cache.exists("k") is False


def test_exists_on_expired_key_removes_entry(cache):
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=1)
        frozen.move_to(base + timedelta(seconds=2))
        assert cache.exists("k") is False


def test_ttl_exactly_at_boundary_expires(cache):
    """Test that TTL expires at exactly the boundary (10.0 seconds)"""
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=10)
        
        # At exactly 10.0 seconds, should expire
        frozen.move_to(base + timedelta(seconds=10))
        assert cache.get("k") is None
        assert cache.stats()["misses"] > 0


def test_ttl_just_before_boundary_returns_value(cache):
    """Test that TTL returns value just before expiration"""
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=10)
        
        # At 9.999 seconds, should still be valid
        frozen.move_to(base + timedelta(seconds=9, microseconds=999000))
        assert cache.get("k") == "v"


def test_ttl_just_after_boundary_expires(cache):
    """Test that TTL expires just after boundary"""
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=10)
        
        # At 10.001 seconds, should be expired
        frozen.move_to(base + timedelta(seconds=10, microseconds=1000))
        assert cache.get("k") is None


def test_multiple_keys_with_different_ttls(cache):
    """Test multiple keys with different TTL values"""
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k1", "v1", ttl=5)
        cache.set("k2", "v2", ttl=10)
        cache.set("k3", "v3", ttl=15)
        
        frozen.move_to(base + timedelta(seconds=6))
        assert cache.get("k1") is None  # expired
        assert cache.get("k2") == "v2"  # still valid
        assert cache.get("k3") == "v3"  # still valid
        
        frozen.move_to(base + timedelta(seconds=11))
        assert cache.get("k2") is None  # expired
        assert cache.get("k3") == "v3"  # still valid
        
        frozen.move_to(base + timedelta(seconds=16))
        assert cache.get("k3") is None  # expired


def test_ttl_zero_expires_immediately(cache):
    """Test that TTL=0 expires immediately"""
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=0)
        # Even at the same time, should be expired
        assert cache.get("k") is None


def test_ttl_with_get_removes_from_storage(cache):
    """Test that get() removes expired entry from internal storage"""
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=1)
        assert cache.stats()["size"] == 1
        
        frozen.move_to(base + timedelta(seconds=2))
        assert cache.get("k") is None
        # Entry should be removed from storage
        assert cache.stats()["size"] == 0
        assert cache.exists("k") is False


def test_ttl_with_exists_removes_from_storage(cache):
    """Test that exists() removes expired entry from internal storage"""
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=1)
        assert cache.stats()["size"] == 1
        
        frozen.move_to(base + timedelta(seconds=2))
        assert cache.exists("k") is False
        # Entry should be removed from storage
        assert cache.stats()["size"] == 0


def test_ttl_expired_key_increments_miss_counter(cache):
    """Test that accessing expired key increments miss counter"""
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("k", "v", ttl=1)
        initial_misses = cache.stats()["misses"]
        
        frozen.move_to(base + timedelta(seconds=2))
        before = cache.stats()["misses"]
        cache.get("k")  # Should be None and increment miss
        after = cache.stats()["misses"]
        
        assert after == before + 1


def test_ttl_mixed_with_no_ttl_keys(cache):
    """Test cache with mix of TTL and non-TTL keys"""
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("no_ttl", "v1", ttl=None)
        cache.set("with_ttl", "v2", ttl=5)
        
        frozen.move_to(base + timedelta(seconds=6))
        assert cache.get("no_ttl") == "v1"  # Still valid
        assert cache.get("with_ttl") is None  # Expired



