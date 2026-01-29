import pytest
import time
import sys
import os

repo_type = os.environ.get('CACHE_REPO', 'after')
if repo_type == 'before':
    sys.path.insert(0, '/app/repository_before')
    from main import UnoptimizedCache as RealCache
    class Cache(RealCache):
        def __init__(self, *args, **kwargs):
            if 'logging_enabled' in kwargs:
                del kwargs['logging_enabled']
            super().__init__(*args, **kwargs)
else:
    sys.path.insert(0, '/app/repository_after')
    from main import OptimizedCache as Cache

@pytest.mark.timeout(10)
class TestGetPerformance:
    def test_get_operations_per_second(self):
        cache = Cache(max_size=100000, default_ttl=300, logging_enabled=False)
        
        for i in range(10000):
            cache.set(f'key_{i}', f'value_{i}')
        
        keys = [f'key_{i % 10000}' for i in range(50000)]
        
        start = time.time()
        for key in keys:
            cache.get(key)
        elapsed = time.time() - start
        
        ops_per_sec = 50000 / elapsed
        assert ops_per_sec >= 70000, f"Get operations {ops_per_sec:.0f}/sec below 70000/sec threshold"


@pytest.mark.timeout(10)
class TestSetPerformance:
    def test_set_operations_per_second(self):
        cache = Cache(max_size=100000, default_ttl=300, logging_enabled=False)
        
        items = [(f'key_{i}', f'value_{i}') for i in range(25000)]
        
        start = time.time()
        for key, value in items:
            cache.set(key, value)
        elapsed = time.time() - start
        
        ops_per_sec = 25000 / elapsed
        assert ops_per_sec >= 50000, f"Set operations {ops_per_sec:.0f}/sec below 50000/sec threshold"


@pytest.mark.timeout(10)
class TestLookupScaling:
    def test_lookup_time_scales_constant(self):
        cache = Cache(max_size=50000, default_ttl=300, logging_enabled=False)
        
        for i in range(1000):
            cache.set(f'key_{i}', f'value_{i}')
        
        lookup_key = 'key_500'
        
        start = time.time()
        for _ in range(10000):
            cache.get(lookup_key)
        time_1k = time.time() - start
        
        for i in range(1000, 10000):
            cache.set(f'key_{i}', f'value_{i}')
        
        start = time.time()
        for _ in range(10000):
            cache.get(lookup_key)
        time_10k = time.time() - start
        
        ratio = time_10k / time_1k
        assert ratio < 2.0, f"Lookup time ratio {ratio:.2f} suggests O(n) instead of O(1)"


@pytest.mark.timeout(10)
class TestLRUEvictionPerformance:
    def test_eviction_performance(self):
        cache = Cache(max_size=1000, default_ttl=300, logging_enabled=False)
        
        for i in range(1000):
            cache.set(f'key_{i}', f'value_{i}')
        
        new_items = [(f'new_key_{i}', f'new_value_{i}') for i in range(5000)]
        
        start = time.time()
        for key, value in new_items:
            cache.set(key, value)
        elapsed = time.time() - start
        
        assert elapsed < 0.5, f"5000 evictions took {elapsed:.3f}s, expected < 0.5s"


@pytest.mark.timeout(10)
class TestSortingPerformance:
    def test_get_lru_entries_performance(self):
        cache = Cache(max_size=20000, default_ttl=300, logging_enabled=False)
        
        for i in range(10000):
            cache.set(f'key_{i}', f'value_{i}')
            cache.get(f'key_{i}')
        
        start = time.time()
        result = cache.get_lru_entries(10)
        elapsed = time.time() - start
        
        assert elapsed < 0.05, f"get_lru_entries took {elapsed:.3f}s, expected < 0.05s"
        assert len(result) == 10
    
    def test_get_mru_entries_performance(self):
        cache = Cache(max_size=20000, default_ttl=300, logging_enabled=False)
        
        for i in range(10000):
            cache.set(f'key_{i}', f'value_{i}')
            cache.get(f'key_{i}')
        
        start = time.time()
        result = cache.get_mru_entries(10)
        elapsed = time.time() - start
        
        assert elapsed < 0.05, f"get_mru_entries took {elapsed:.3f}s, expected < 0.05s"
        assert len(result) == 10
    
    def test_get_most_accessed_performance(self):
        cache = Cache(max_size=20000, default_ttl=300, logging_enabled=False)
        
        for i in range(10000):
            cache.set(f'key_{i}', f'value_{i}')
            if i % 100 == 0:
                for _ in range(5):
                    cache.get(f'key_{i}')
        
        start = time.time()
        result = cache.get_most_accessed(10)
        elapsed = time.time() - start
        
        assert elapsed < 0.05, f"get_most_accessed took {elapsed:.3f}s, expected < 0.05s"
        assert len(result) == 10

@pytest.mark.timeout(10)
class TestComplexKeyPerformance:
    def test_complex_key_operations(self):
        cache = Cache(max_size=10000, default_ttl=300, logging_enabled=False)
        
        keys = [{'user': i, 'type': 'data'} for i in range(5000)]
        value = {'value': 1}
        
        start = time.time()
        for key in keys:
            cache.set(key, value)
        set_elapsed = time.time() - start
        
        start = time.time()
        for key in keys:
            cache.get(key)
        get_elapsed = time.time() - start
        
        set_ops = 5000 / set_elapsed
        get_ops = 5000 / get_elapsed
        
        assert set_ops >= 15000, f"Complex key set {set_ops:.0f}/sec below threshold"
        assert get_ops >= 40000, f"Complex key get {get_ops:.0f}/sec below threshold"

@pytest.mark.timeout(10)
class TestPatternSearchPerformance:
    def test_prefix_search_uses_startswith(self):
        cache = Cache(max_size=20000, default_ttl=300, logging_enabled=False)
        
        for i in range(10000):
            cache.set(f'user:{i}:data', f'value_{i}')
        
        start = time.time()
        results = cache.find_by_prefix('user:500')
        elapsed = time.time() - start
        
        assert elapsed < 0.1, f"Prefix search took {elapsed:.3f}s, expected < 0.1s"
        assert len(results) > 0
    
    def test_pattern_search_uses_regex(self):
        cache = Cache(max_size=20000, default_ttl=300, logging_enabled=False)
        
        for i in range(10000):
            cache.set(f'user:{i}:data', f'value_{i}')
        
        start = time.time()
        results = cache.find_by_pattern('user:*:data')
        elapsed = time.time() - start
        
        assert elapsed < 0.2, f"Pattern search took {elapsed:.3f}s, expected < 0.2s"
        assert len(results) == 10000

@pytest.mark.timeout(10)
class TestTTLCleanupPerformance:
    def test_ttl_cleanup_uses_heap(self):
        cache = Cache(max_size=20000, default_ttl=0.001, logging_enabled=False)
        
        for i in range(10000):
            cache.set(f'key_{i}', f'value_{i}')
        
        time.sleep(0.01)
        
        start = time.time()
        expired = cache.cleanup_expired()
        elapsed = time.time() - start
        
        assert elapsed < 0.1, f"Cleanup took {elapsed:.3f}s, expected < 0.1s"
        assert expired == 10000

@pytest.mark.timeout(10)
class TestLoggingPerformance:
    def test_logging_disabled_overhead(self):
        cache_with_log = Cache(max_size=50000, default_ttl=300, logging_enabled=True)
        cache_no_log = Cache(max_size=50000, default_ttl=300, logging_enabled=False)
        
        keys = [f'key_{i}' for i in range(10000)]
        values = [f'value_{i}' for i in range(10000)]
        items = list(zip(keys, values))
        
        start = time.time()
        for k, v in items:
            cache_no_log.set(k, v)
        time_no_log = time.time() - start
        
        start = time.time()
        for k, v in items:
            cache_with_log.set(k, v)
        time_with_log = time.time() - start
        
        overhead = (time_with_log - time_no_log) / time_no_log if time_no_log > 0 else 0
        assert overhead < 0.5, f"Logging overhead {overhead:.1%} exceeds 50%"

@pytest.mark.timeout(10)
class TestFunctionalCorrectness:
    def test_basic_set_get(self):
        cache = Cache(max_size=100, default_ttl=300)
        cache.set('key1', 'value1')
        assert cache.get('key1') == 'value1'
    
    def test_complex_dict_key(self):
        cache = Cache(max_size=100, default_ttl=300)
        cache.set({'a': 1, 'b': 2}, 'complex_value')
        assert cache.get({'a': 1, 'b': 2}) == 'complex_value'
        assert cache.get({'b': 2, 'a': 1}) == 'complex_value'
    
    def test_complex_list_key(self):
        cache = Cache(max_size=100, default_ttl=300)
        cache.set([1, 2, 3], 'list_value')
        assert cache.get([1, 2, 3]) == 'list_value'
    
    def test_lru_eviction_order(self):
        cache = Cache(max_size=3, default_ttl=300)
        cache.set('a', 1)
        cache.set('b', 2)
        cache.set('c', 3)
        cache.get('a')
        cache.set('d', 4)
        assert cache.get('a') == 1
        assert cache.get('b') is None
        assert cache.get('c') == 3
        assert cache.get('d') == 4
    
    def test_ttl_expiration(self):
        cache = Cache(default_ttl=0.05)
        cache.set('temp', 'value')
        assert cache.get('temp') == 'value'
        time.sleep(0.1)
        assert cache.get('temp') is None
    
    def test_delete(self):
        cache = Cache(max_size=100, default_ttl=300)
        cache.set('key', 'value')
        assert cache.delete('key') is True
        assert cache.get('key') is None
        assert cache.delete('nonexistent') is False
    
    def test_clear(self):
        cache = Cache(max_size=100, default_ttl=300)
        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        cache.clear()
        assert cache.size() == 0
    
    def test_get_or_set(self):
        cache = Cache(max_size=100, default_ttl=300)
        result = cache.get_or_set('key', lambda: 'computed_value')
        assert result == 'computed_value'
        result = cache.get_or_set('key', lambda: 'new_value')
        assert result == 'computed_value'
    

    def test_keys_values_items(self):
        cache = Cache(max_size=100, default_ttl=300)
        cache.set('a', 1)
        cache.set('b', 2)
        assert set(cache.keys()) == {'a', 'b'}
        assert set(cache.values()) == {1, 2}
        items = cache.items()
        assert len(items) == 2
    @pytest.mark.timeout(10)
    def test_get_stats(self):
        cache = Cache(max_size=100, default_ttl=300)
        cache.set('key', 'value')
        cache.get('key')
        cache.get('missing')
        stats = cache.get_stats()
        assert stats['hits'] == 1
        assert stats['misses'] == 1
        assert stats['hit_rate'] == 0.5
    
    def test_export_stats_log(self):
        cache = Cache(max_size=100, default_ttl=300, logging_enabled=True)
        cache.set('key', 'value')
        cache.get('key')
        log = cache.export_stats_log()
        assert 'SET' in log
        assert 'HIT' in log
    
    def test_value_isolation(self):
        cache = Cache(max_size=100, default_ttl=300)
        original = {'a': [1, 2, 3]}
        cache.set('key', original)
        original['a'].append(4)
        retrieved = cache.get('key')
        assert retrieved == {'a': [1, 2, 3]}
        retrieved['a'].append(5)
        retrieved2 = cache.get('key')
        assert retrieved2 == {'a': [1, 2, 3]}
