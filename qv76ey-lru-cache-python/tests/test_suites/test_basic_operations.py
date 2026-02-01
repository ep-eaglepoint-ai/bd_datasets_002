from lru_cache import LRUCache


class TestBasicOperations:
    def test_put_and_get_single_item(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        assert cache.get(1) == 1
    
    def test_get_nonexistent_key(self):
        cache = LRUCache(2)
        assert cache.get(1) == -1
    
    def test_put_update_existing_key(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        cache.put(1, 10)
        assert cache.get(1) == 10
    
    def test_multiple_puts_and_gets(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        cache.put(2, 2)
        assert cache.get(1) == 1
        assert cache.get(2) == 2
    
    def test_repeated_gets_on_same_key(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        assert cache.get(1) == 1
        assert cache.get(1) == 1
        assert cache.get(1) == 1
    
    def test_repeated_puts_on_same_key(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        cache.put(1, 2)
        cache.put(1, 3)
        assert cache.get(1) == 3
    
    def test_alternating_operations(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        assert cache.get(1) == 1
        cache.put(2, 2)
        assert cache.get(2) == 2
        cache.put(3, 3)
        assert cache.get(1) == -1
        assert cache.get(2) == 2
        assert cache.get(3) == 3
