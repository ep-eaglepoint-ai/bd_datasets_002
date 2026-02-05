import pytest


def test_set_get_roundtrip(cache):
    cache.set("a", 123)
    assert cache.get("a") == 123


def test_get_missing_returns_none_and_increments_miss(cache):
    before = cache.stats()
    assert cache.get("missing") is None
    after = cache.stats()
    assert after["misses"] == before["misses"] + 1


def test_delete_existing_returns_true_and_removes_key(cache):
    cache.set("k", "v")
    assert cache.delete("k") is True
    assert cache.get("k") is None


def test_delete_missing_returns_false(cache):
    assert cache.delete("nope") is False


def test_exists_true_for_present_key(cache):
    cache.set("k", "v")
    assert cache.exists("k") is True


def test_exists_false_for_missing_key(cache):
    assert cache.exists("k") is False


def test_clear_removes_all_keys_and_resets_stats(cache):
    cache.set("a", 1)
    cache.set("b", 2)
    _ = cache.get("a")  # hit
    _ = cache.get("missing")  # miss

    cache.clear()

    stats = cache.stats()
    assert stats["size"] == 0
    assert stats["hits"] == 0
    assert stats["misses"] == 0
    assert stats["evictions"] == 0

    # After clear(), keys are gone (these get() calls will count as misses).
    assert cache.get("a") is None
    assert cache.get("b") is None


@pytest.mark.parametrize(
    "key,value",
    [
        ("unicode:🧪", "välue-✓"),
        ("x" * 10_001, "long-key"),
    ],
)
def test_unicode_and_very_long_keys_work(cache, key, value):
    cache.set(key, value)
    assert cache.get(key) == value


def test_operations_on_empty_cache_do_not_raise(cache):
    """Test that operations on empty cache don't raise exceptions"""
    assert cache.get("missing") is None
    assert cache.delete("missing") is False
    assert cache.exists("missing") is False
    assert cache.keys("*") == []
    assert cache.stats()["size"] == 0
    cache.clear()  # Should not raise


def test_set_get_with_none_value(cache):
    """Test setting and getting None values"""
    cache.set("none_key", None)
    assert cache.get("none_key") is None
    assert cache.exists("none_key") is True


def test_set_get_with_various_data_types(cache):
    """Test setting and getting various data types"""
    test_cases = [
        ("int", 42),
        ("float", 3.14),
        ("string", "hello"),
        ("list", [1, 2, 3]),
        ("dict", {"a": 1, "b": 2}),
        ("tuple", (1, 2, 3)),
        ("bool", True),
        ("bool_false", False),
    ]
    
    for key, value in test_cases:
        cache.set(key, value)
        assert cache.get(key) == value


def test_delete_nonexistent_key_returns_false(cache):
    """Test deleting non-existent key returns False"""
    assert cache.delete("nonexistent") is False
    assert cache.stats()["misses"] == 0  # Delete doesn't increment misses


def test_exists_on_nonexistent_key_returns_false(cache):
    """Test exists() on non-existent key returns False"""
    assert cache.exists("nonexistent") is False
    assert cache.stats()["misses"] == 0  # exists() doesn't increment misses


def test_clear_on_empty_cache(cache):
    """Test clear() on empty cache"""
    cache.clear()
    stats = cache.stats()
    assert stats["size"] == 0
    assert stats["hits"] == 0
    assert stats["misses"] == 0
    assert stats["evictions"] == 0


def test_set_overwrites_existing_key(cache):
    """Test that set() overwrites existing key"""
    cache.set("key", "value1")
    assert cache.get("key") == "value1"
    
    cache.set("key", "value2")
    assert cache.get("key") == "value2"
    assert cache.stats()["size"] == 1


def test_get_returns_none_not_keyerror(cache):
    """Test that get() returns None, not raises KeyError"""
    result = cache.get("nonexistent")
    assert result is None
    # Should not raise KeyError
    try:
        cache.get("nonexistent")
    except KeyError:
        pytest.fail("get() should return None, not raise KeyError")


def test_unicode_values_work(cache):
    """Test unicode values work correctly"""
    unicode_values = [
        "välue-✓",
        "测试",
        "🎉",
        "🚀🚀🚀",
    ]
    
    for i, value in enumerate(unicode_values):
        key = f"unicode_{i}"
        cache.set(key, value)
        assert cache.get(key) == value


def test_very_long_values_work(cache):
    """Test very long values work correctly"""
    long_value = "x" * 100000
    cache.set("long_value", long_value)
    retrieved = cache.get("long_value")
    assert retrieved == long_value
    assert len(retrieved) == 100000


def test_special_characters_in_keys(cache):
    """Test special characters in keys"""
    special_keys = [
        "key:with:colons",
        "key.with.dots",
        "key-with-dashes",
        "key_with_underscores",
        "key with spaces",
        "key@with#special$chars",
    ]
    
    for key in special_keys:
        cache.set(key, "value")
        assert cache.get(key) == "value"


def test_empty_string_key_and_value(cache):
    """Test empty string as key and value"""
    cache.set("", "empty_key_value")
    assert cache.get("") == "empty_key_value"
    
    cache.set("empty_value_key", "")
    assert cache.get("empty_value_key") == ""


def test_numeric_string_keys(cache):
    """Test numeric strings as keys"""
    cache.set("123", "numeric_string_key")
    cache.set("0", "zero_key")
    cache.set("-1", "negative_key")
    
    assert cache.get("123") == "numeric_string_key"
    assert cache.get("0") == "zero_key"
    assert cache.get("-1") == "negative_key"

