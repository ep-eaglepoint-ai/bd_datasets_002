from lru_cache import LRUCache


class TestKeyValueTypes:
    def test_string_keys(self):
        cache = LRUCache(2)
        cache.put("key1", "value1")
        cache.put("key2", "value2")
        assert cache.get("key1") == "value1"
        assert cache.get("key2") == "value2"
    
    def test_tuple_keys(self):
        cache = LRUCache(2)
        cache.put((1, 2), "tuple_value")
        cache.put((3, 4), "another_value")
        assert cache.get((1, 2)) == "tuple_value"
        assert cache.get((3, 4)) == "another_value"
    
    def test_none_values(self):
        cache = LRUCache(2)
        cache.put(1, None)
        assert cache.get(1) is None
        assert cache.get(2) == -1
    
    def test_mixed_types(self):
        cache = LRUCache(5)
        cache.put(1, "string")
        cache.put("key", 100)
        cache.put((1, 2), [1, 2, 3])
        cache.put(3.14, {"dict": "value"})
        cache.put(False, None)
        assert cache.get(1) == "string"
        assert cache.get("key") == 100
        assert cache.get((1, 2)) == [1, 2, 3]
        assert cache.get(3.14) == {"dict": "value"}
        assert cache.get(False) is None
    
    def test_zero_and_negative_keys(self):
        cache = LRUCache(3)
        cache.put(0, "zero")
        cache.put(-1, "negative")
        cache.put(-100, "large_negative")
        assert cache.get(0) == "zero"
        assert cache.get(-1) == "negative"
        assert cache.get(-100) == "large_negative"
