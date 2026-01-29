from lru_cache import LRUCache, Node


class TestStructure:
    def test_lru_cache_class_exists(self):
        assert LRUCache is not None
    
    def test_node_class_exists(self):
        assert Node is not None
    
    def test_lru_cache_has_required_methods(self):
        cache = LRUCache(1)
        assert hasattr(cache, 'get')
        assert hasattr(cache, 'put')
        assert callable(cache.get)
        assert callable(cache.put)
    
    def test_lru_cache_has_dictionary(self):
        cache = LRUCache(1)
        assert hasattr(cache, 'cache')
        assert isinstance(cache.cache, dict)
    
    def test_lru_cache_has_dummy_nodes(self):
        cache = LRUCache(1)
        assert hasattr(cache, 'head')
        assert hasattr(cache, 'tail')
        assert cache.head.next is not None
        assert cache.tail.prev is not None
    
    def test_node_has_required_attributes(self):
        node = Node(1, 1)
        assert hasattr(node, 'key')
        assert hasattr(node, 'value')
        assert hasattr(node, 'prev')
        assert hasattr(node, 'next')
    
    def test_lru_cache_has_helper_methods(self):
        cache = LRUCache(1)
        assert hasattr(cache, '_add_to_head')
        assert hasattr(cache, '_remove_node')
        assert hasattr(cache, '_move_to_head')
