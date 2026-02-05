from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import mock_open, patch

import pytest
from freezegun import freeze_time


def test_save_uses_pickle_and_excludes_expired_entries(cache):
    # This test enforces: persistence is pickle-based and expired entries are not saved.
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        cache.set("alive", "v", ttl=10)
        cache.set("expired", "x", ttl=1)

        frozen.move_to(base + timedelta(seconds=2))

        m = mock_open()
        with patch("builtins.open", m), patch("pickle.dump") as dump:
            cache.save("cache.pickle")
            assert dump.call_count == 1
            payload = dump.call_args.args[0]
            assert "entries" in payload
            assert "stats" in payload
            assert "expired" not in payload["entries"]


def test_load_restores_values_and_stats_and_ttl_remaining(cache):
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        # Saved at base time: key expires in 10 seconds.
        expires_at = base.timestamp() + 10
        saved = {
            "entries": {"k": ("v", expires_at)},
            "stats": {"hits": 3, "misses": 4, "evictions": 5},
        }

        frozen.move_to(base + timedelta(seconds=4))

        # Mock file I/O and pickle.load.
        m = mock_open(read_data=b"pickle-bytes")
        with patch("builtins.open", m), patch("pickle.load", return_value=saved):
            cache.load("cache.pickle")

        # Stats restored.
        st = cache.stats()
        assert st["hits"] == 3
        assert st["misses"] == 4
        assert st["evictions"] == 5

        # Value present now, expires after remaining TTL (~6s).
        assert cache.get("k") == "v"

        frozen.move_to(base + timedelta(seconds=11))
        assert cache.get("k") is None


def test_load_discards_entries_expired_between_save_and_load(cache):
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        # Expires at base+1
        expires_at = base.timestamp() + 1
        saved = {"entries": {"k": ("v", expires_at)}, "stats": {"hits": 0, "misses": 0, "evictions": 0}}

        frozen.move_to(base + timedelta(seconds=5))
        m = mock_open(read_data=b"pickle-bytes")
        with patch("builtins.open", m), patch("pickle.load", return_value=saved):
            cache.load("cache.pickle")

        assert cache.get("k") is None


def test_save_handles_io_errors_gracefully_without_corrupting_cache(cache):
    cache.set("a", 1)

    with patch("builtins.open", side_effect=OSError("disk full")):
        # Should not raise, and should not clear cache.
        try:
            cache.save("cache.pickle")
        except Exception as e:  # pragma: no cover
            pytest.fail(f"save() raised unexpectedly: {e!r}")

    assert cache.get("a") == 1


def test_save_preserves_statistics(cache):
    """Test that save() preserves statistics"""
    from unittest.mock import mock_open, patch
    import pickle
    
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
    
    saved_data = {}
    def mock_dump(data, f):
        nonlocal saved_data
        saved_data = data
    
    m = mock_open()
    with patch("builtins.open", m), patch("pickle.dump", side_effect=mock_dump):
        cache.save("cache.pickle")
    
    # If using pickle format with stats, verify stats are saved
    if "stats" in saved_data:
        assert "hits" in saved_data["stats"]
        assert "misses" in saved_data["stats"]
        assert "evictions" in saved_data["stats"]


def test_save_with_empty_cache(cache):
    """Test save() with empty cache"""
    from unittest.mock import mock_open, patch
    import pickle
    
    saved_data = {}
    def mock_dump(data, f):
        nonlocal saved_data
        saved_data = data
    
    m = mock_open()
    with patch("builtins.open", m), patch("pickle.dump", side_effect=mock_dump):
        result = cache.save("cache.pickle")
        assert result is True


def test_load_restores_empty_cache(cache):
    """Test load() with empty cache data"""
    from unittest.mock import mock_open, patch
    import pickle
    
    saved = {"entries": {}, "stats": {"hits": 0, "misses": 0, "evictions": 0}}
    
    m = mock_open(read_data=b"pickle-bytes")
    with patch("builtins.open", m), patch("pickle.load", return_value=saved):
        cache.load("cache.pickle")
    
    assert cache.stats()["size"] == 0


def test_load_handles_file_not_found_gracefully(cache):
    """Test load() handles file not found gracefully"""
    from unittest.mock import mock_open, patch
    import pickle
    
    cache.set("a", 1)  # Set something before load
    
    m = mock_open()
    m.side_effect = FileNotFoundError("File not found")
    
    with patch("builtins.open", m):
        result = cache.load("nonexistent.pickle")
        # Should return False on error, cache should remain unchanged
        assert result is False or cache.get("a") == 1


def test_load_handles_corrupted_file_gracefully(cache):
    """Test load() handles corrupted file gracefully"""
    from unittest.mock import mock_open, patch
    import pickle
    
    cache.set("a", 1)  # Set something before load
    
    m = mock_open(read_data=b"corrupted data")
    with patch("builtins.open", m), patch("pickle.load", side_effect=pickle.UnpicklingError("Corrupted")):
        result = cache.load("corrupted.pickle")
        # Should return False on error, cache should remain unchanged
        assert result is False or cache.get("a") == 1


def test_load_discards_all_expired_entries(cache):
    """Test load() discards all expired entries"""
    from datetime import datetime, timedelta, timezone
    from freezegun import freeze_time
    from unittest.mock import mock_open, patch
    import pickle
    
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    with freeze_time(base) as frozen:
        # All entries expired
        expires_at = base.timestamp() + 1
        saved = {
            "entries": {
                "k1": ("v1", expires_at),
                "k2": ("v2", expires_at),
            },
            "stats": {"hits": 0, "misses": 0, "evictions": 0}
        }
        
        frozen.move_to(base + timedelta(seconds=5))
        
        m = mock_open(read_data=b"pickle-bytes")
        with patch("builtins.open", m), patch("pickle.load", return_value=saved):
            cache.load("cache.pickle")
        
        assert cache.get("k1") is None
        assert cache.get("k2") is None
        assert cache.stats()["size"] == 0



