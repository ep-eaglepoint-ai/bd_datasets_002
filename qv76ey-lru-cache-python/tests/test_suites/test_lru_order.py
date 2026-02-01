from lru_cache import LRUCache


class TestLRUOrder:
    def test_lru_order_basic(self):
        cache = LRUCache(3)
        cache.put(1, 1)
        cache.put(2, 2)
        cache.put(3, 3)
        cache.put(4, 4)
        assert cache.get(1) == -1
        assert cache.get(2) == 2
        assert cache.get(3) == 3
        assert cache.get(4) == 4
    
    def test_lru_order_with_gets(self):
        cache = LRUCache(3)
        cache.put(1, 1)
        cache.put(2, 2)
        cache.put(3, 3)
        cache.get(1)
        cache.get(2)
        cache.put(4, 4)
        assert cache.get(3) == -1
        assert cache.get(1) == 1
        assert cache.get(2) == 2
        assert cache.get(4) == 4
    
    def test_lru_order_complex_sequence(self):
        cache = LRUCache(2)
        cache.put(2, 1)
        cache.put(1, 1)
        cache.put(2, 3)
        cache.put(4, 1)
        assert cache.get(1) == -1
        assert cache.get(2) == 3
