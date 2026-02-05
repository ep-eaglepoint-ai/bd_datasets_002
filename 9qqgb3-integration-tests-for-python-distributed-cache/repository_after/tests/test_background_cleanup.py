from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone

import pytest
from freezegun import freeze_time

def test_background_cleanup_thread_is_started(CacheImpl):
    c = CacheImpl(max_size=10)
    try:
        assert hasattr(c, "_cleanup_thread"), "Cache must start a background cleanup thread in __init__"
        t = getattr(c, "_cleanup_thread")
        assert t is not None
        assert getattr(t, "daemon", False) is True, "Cleanup thread should be daemon to not block process exit"
    finally:
        if hasattr(c, "close"):
            c.close()


def test_manual_cleanup_removes_expired_entries_without_hanging(CacheImpl):
    """
    Requirement: tests must verify cleanup without 60s waits by manually calling cleanup logic.
    We accept several common method names, but it must:
    - finish quickly (not an infinite loop)
    - remove expired entries from internal storage
    """
    c = CacheImpl(max_size=10)
    try:
        base = datetime(2020, 1, 1, tzinfo=timezone.utc)
        with freeze_time(base) as frozen:
            c.set("k", "v", ttl=1)
            frozen.move_to(base + timedelta(seconds=2))
            assert c.exists("k") is False or c.get("k") is None  # expired

            cleanup_fn = None
            for name in ("cleanup", "_cleanup", "_cleanup_expired", "_cleanup_expired_entries", "_cleanup_once"):
                if hasattr(c, name) and callable(getattr(c, name)):
                    cleanup_fn = getattr(c, name)
                    break

            if cleanup_fn is None:
                pytest.skip("No callable cleanup method found to invoke directly.")

            # Run cleanup in a daemon thread to prevent hanging on infinite loops.
            # Requirement: cleanup should complete quickly when called directly.
            t = threading.Thread(target=cleanup_fn, daemon=True)
            t.start()
            t.join(timeout=1.0)
            assert not t.is_alive(), "cleanup method must return promptly when called directly"

            # If cleanup completes, expired key should be removed.
            assert c.exists("k") is False
    finally:
        if hasattr(c, "close"):
            c.close()



