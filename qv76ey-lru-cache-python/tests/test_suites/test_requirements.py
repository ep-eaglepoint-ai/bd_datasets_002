from lru_cache import LRUCache


class TestRequirements:
    def test_o1_get_operation(self):
        cache = LRUCache(1000)
        for i in range(1000):
            cache.put(i, i * 10)
        for i in range(1000):
            assert cache.get(i) == i * 10
    
    def test_o1_put_operation(self):
        cache = LRUCache(1000)
        for i in range(2000):
            cache.put(i, i)
        assert len(cache.cache) == 1000
    
    def test_capacity_enforcement(self):
        cache = LRUCache(3)
        cache.put(1, 1)
        cache.put(2, 2)
        cache.put(3, 3)
        cache.put(4, 4)
        assert len(cache.cache) == 3
        assert cache.size == 3
    
    def test_update_does_not_increase_size(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        initial_size = cache.size
        cache.put(1, 10)
        assert cache.size == initial_size
        assert cache.get(1) == 10
