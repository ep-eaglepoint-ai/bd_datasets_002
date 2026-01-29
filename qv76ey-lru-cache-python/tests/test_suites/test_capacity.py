from lru_cache import LRUCache


class TestCapacity:
    def test_eviction_at_capacity(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        cache.put(2, 2)
        cache.put(3, 3)
        assert cache.get(1) == -1
        assert cache.get(2) == 2
        assert cache.get(3) == 3
    
    def test_capacity_one(self):
        cache = LRUCache(1)
        cache.put(1, 1)
        assert cache.get(1) == 1
        cache.put(2, 2)
        assert cache.get(1) == -1
        assert cache.get(2) == 2
    
    def test_eviction_preserves_recently_used(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        cache.put(2, 2)
        cache.get(1)
        cache.put(3, 3)
        assert cache.get(1) == 1
        assert cache.get(2) == -1
        assert cache.get(3) == 3
    
    def test_update_prevents_eviction(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        cache.put(2, 2)
        cache.put(1, 10)
        cache.put(3, 3)
        assert cache.get(1) == 10
        assert cache.get(2) == -1
        assert cache.get(3) == 3
    
    def test_large_capacity(self):
        cache = LRUCache(100)
        for i in range(100):
            cache.put(i, i * 10)
        for i in range(100):
            assert cache.get(i) == i * 10
        cache.put(100, 1000)
        assert cache.get(0) == -1
        assert cache.get(100) == 1000
    
    def test_fill_and_refill(self):
        cache = LRUCache(2)
        cache.put(1, 1)
        cache.put(2, 2)
        cache.put(3, 3)
        cache.put(4, 4)
        assert cache.get(1) == -1
        assert cache.get(2) == -1
        assert cache.get(3) == 3
        assert cache.get(4) == 4
