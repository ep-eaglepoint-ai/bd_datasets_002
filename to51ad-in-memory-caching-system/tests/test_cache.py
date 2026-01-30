import pytest
import time
import threading
import os
import sys

REPO_TYPE = os.environ.get("REPO_TYPE", "after")
IS_BEFORE = REPO_TYPE == "before"

if REPO_TYPE == "before":
    from repository_before.main import UnoptimizedCache as Cache, CacheEntry
else:
    from repository_after.main import OptimizedCache as Cache, CacheEntry


class TestBasicOperations:
    def test_set_and_get_simple_key(self):
        cache = Cache(max_size=100)
        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

    def test_set_and_get_integer_key(self):
        cache = Cache(max_size=100)
        cache.set(123, "value123")
        assert cache.get(123) == "value123"

    def test_get_nonexistent_key(self):
        cache = Cache(max_size=100)
        assert cache.get("nonexistent") is None

    def test_set_overwrites_existing(self):
        cache = Cache(max_size=100)
        cache.set("key", "value1")
        cache.set("key", "value2")
        assert cache.get("key") == "value2"

    def test_delete_existing_key(self):
        cache = Cache(max_size=100)
        cache.set("key", "value")
        assert cache.delete("key") is True
        assert cache.get("key") is None

    def test_delete_nonexistent_key(self):
        cache = Cache(max_size=100)
        assert cache.delete("nonexistent") is False

    def test_clear_cache(self):
        cache = Cache(max_size=100)
        for i in range(10):
            cache.set(f"key{i}", f"value{i}")
        cache.clear()
        assert len(cache.keys()) == 0

    def test_size(self):
        cache = Cache(max_size=100)
        for i in range(5):
            cache.set(f"key{i}", f"value{i}")
        assert len(cache.keys()) == 5

    def test_keys(self):
        cache = Cache(max_size=100)
        cache.set("a", 1)
        cache.set("b", 2)
        keys = cache.keys()
        assert set(keys) == {"a", "b"}

    def test_values(self):
        cache = Cache(max_size=100)
        cache.set("a", 1)
        cache.set("b", 2)
        values = cache.values()
        assert set(values) == {1, 2}

    def test_items(self):
        cache = Cache(max_size=100)
        cache.set("a", 1)
        cache.set("b", 2)
        items = cache.items()
        assert set(items) == {("a", 1), ("b", 2)}

    def test_total_memory_size(self):
        cache = Cache(max_size=100)
        cache.set("key", "value")
        assert cache.total_memory_size() > 0

    def test_get_or_set_miss(self):
        cache = Cache(max_size=100)
        result = cache.get_or_set("key", lambda: "computed_value")
        assert result == "computed_value"
        assert cache.get("key") == "computed_value"

    def test_get_or_set_hit(self):
        cache = Cache(max_size=100)
        cache.set("key", "existing")
        result = cache.get_or_set("key", lambda: "computed")
        assert result == "existing"

    def test_get_many(self):
        cache = Cache(max_size=100)
        cache.set("a", 1)
        cache.set("b", 2)
        results = cache.get_many(["a", "b", "c"])
        assert results["a"] == 1
        assert results["b"] == 2
        assert results["c"] is None

    def test_set_many(self):
        cache = Cache(max_size=100)
        cache.set_many({"a": 1, "b": 2, "c": 3})
        assert cache.get("a") == 1
        assert cache.get("b") == 2
        assert cache.get("c") == 3


class TestComplexKeys:
    def test_dict_key(self):
        cache = Cache(max_size=100)
        key = {"user_id": 123, "session": "abc"}
        cache.set(key, "user_data")
        assert cache.get({"user_id": 123, "session": "abc"}) == "user_data"

    def test_dict_key_order_independent(self):
        cache = Cache(max_size=100)
        cache.set({"a": 1, "b": 2}, "value")
        assert cache.get({"b": 2, "a": 1}) == "value"

    def test_list_key(self):
        cache = Cache(max_size=100)
        key = [1, 2, 3]
        cache.set(key, "list_data")
        assert cache.get([1, 2, 3]) == "list_data"

    def test_nested_complex_key(self):
        cache = Cache(max_size=100)
        key = {"user": {"id": 1, "roles": ["admin", "user"]}, "action": "read"}
        cache.set(key, "nested_data")
        assert cache.get({"user": {"id": 1, "roles": ["admin", "user"]}, "action": "read"}) == "nested_data"

    def test_complex_key_delete(self):
        cache = Cache(max_size=100)
        key = {"id": 1}
        cache.set(key, "value")
        assert cache.delete({"id": 1}) is True
        assert cache.get({"id": 1}) is None


class TestTTLExpiration:
    def test_entry_expires_after_ttl(self):
        cache = Cache(max_size=100, default_ttl=0.1)
        cache.set("key", "value")
        time.sleep(0.15)
        assert cache.get("key") is None

    def test_entry_valid_before_ttl(self):
        cache = Cache(max_size=100, default_ttl=10)
        cache.set("key", "value")
        time.sleep(0.05)
        assert cache.get("key") == "value"

    def test_custom_ttl_per_entry(self):
        cache = Cache(max_size=100, default_ttl=10)
        cache.set("short", "value", ttl_seconds=0.1)
        cache.set("long", "value", ttl_seconds=10)
        time.sleep(0.15)
        assert cache.get("short") is None
        assert cache.get("long") == "value"

    def test_cleanup_expired(self):
        cache = Cache(max_size=100, default_ttl=0.1)
        for i in range(10):
            cache.set(f"key{i}", f"value{i}")
        time.sleep(0.15)
        expired_count = cache.cleanup_expired()
        assert expired_count == 10
        assert len(cache.keys()) == 0

    def test_expired_not_in_keys(self):
        cache = Cache(max_size=100, default_ttl=0.1)
        cache.set("expiring", "value")
        time.sleep(0.15)
        assert "expiring" not in cache.keys()

    def test_expired_not_in_values(self):
        cache = Cache(max_size=100, default_ttl=0.1)
        cache.set("expiring", "unique_value")
        time.sleep(0.15)
        assert "unique_value" not in cache.values()

    def test_expired_not_in_items(self):
        cache = Cache(max_size=100, default_ttl=0.1)
        cache.set("expiring", "value")
        time.sleep(0.15)
        keys = [k for k, v in cache.items()]
        assert "expiring" not in keys


class TestLRUEviction:
    def test_evicts_oldest_when_full(self):
        cache = Cache(max_size=3)
        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)
        cache.set("d", 4)
        assert cache.get("a") is None
        assert cache.get("d") == 4

    def test_access_prevents_eviction(self):
        cache = Cache(max_size=3)
        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)
        cache.get("a")
        cache.set("d", 4)
        assert cache.get("a") == 1
        assert cache.get("b") is None

    def test_eviction_order(self):
        cache = Cache(max_size=5)
        for i in range(5):
            cache.set(f"key{i}", i)
        cache.get("key0")
        cache.get("key1")
        for i in range(5, 8):
            cache.set(f"key{i}", i)
        assert cache.get("key0") == 0
        assert cache.get("key1") == 1
        assert cache.get("key2") is None
        assert cache.get("key3") is None
        assert cache.get("key4") is None


class TestPatternSearch:
    def test_find_by_prefix(self):
        cache = Cache(max_size=100)
        cache.set("user:1:profile", "data1")
        cache.set("user:2:profile", "data2")
        cache.set("session:1", "sess1")
        results = cache.find_by_prefix("user:")
        assert len(results) == 2
        keys = [k for k, v in results]
        assert "user:1:profile" in keys
        assert "user:2:profile" in keys

    def test_find_by_prefix_no_match(self):
        cache = Cache(max_size=100)
        cache.set("user:1", "data")
        results = cache.find_by_prefix("session:")
        assert len(results) == 0

    def test_find_by_pattern_wildcard_star(self):
        cache = Cache(max_size=100)
        cache.set("user:1:profile", "data1")
        cache.set("user:2:profile", "data2")
        cache.set("user:1:settings", "settings1")
        results = cache.find_by_pattern("user:*:profile")
        assert len(results) == 2

    def test_find_by_pattern_wildcard_question(self):
        cache = Cache(max_size=100)
        cache.set("key1", "v1")
        cache.set("key2", "v2")
        cache.set("key10", "v10")
        results = cache.find_by_pattern("key?")
        assert len(results) == 2

    def test_find_by_pattern_complex(self):
        cache = Cache(max_size=100)
        cache.set("api:v1:users:list", "d1")
        cache.set("api:v2:users:list", "d2")
        cache.set("api:v1:orders:list", "d3")
        results = cache.find_by_pattern("api:v?:users:*")
        assert len(results) == 2


class TestStatistics:
    def test_hits_and_misses_via_direct_access(self):
        cache = Cache(max_size=100)
        cache.set("key", "value")
        cache.get("key")
        cache.get("key")
        cache.get("nonexistent")
        assert cache.hits == 2
        assert cache.misses == 1

    def test_get_lru_entries(self):
        cache = Cache(max_size=100)
        cache.set("a", 1)
        time.sleep(0.01)
        cache.set("b", 2)
        time.sleep(0.01)
        cache.set("c", 3)
        cache.get("a")
        lru = cache.get_lru_entries(2)
        assert len(lru) == 2
        keys = [e["key"] for e in lru]
        assert "b" in keys

    def test_get_mru_entries(self):
        cache = Cache(max_size=100)
        cache.set("a", 1)
        time.sleep(0.01)
        cache.set("b", 2)
        time.sleep(0.01)
        cache.set("c", 3)
        cache.get("a")
        mru = cache.get_mru_entries(2)
        keys = [e["key"] for e in mru]
        assert "a" in keys

    def test_get_most_accessed(self):
        cache = Cache(max_size=100)
        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)
        for _ in range(10):
            cache.get("a")
        for _ in range(5):
            cache.get("b")
        cache.get("c")
        most = cache.get_most_accessed(2)
        assert most[0]["key"] == "a"
        assert most[0]["access_count"] == 10
        assert most[1]["key"] == "b"

    def test_export_stats_log(self):
        cache = Cache(max_size=100)
        cache.set("key", "value")
        cache.get("key")
        cache.get("miss")
        log = cache.export_stats_log()
        assert "SET" in log
        assert "HIT" in log
        assert "MISS" in log

    def test_get_stats(self):
        cache = Cache(max_size=100)
        cache.set("key", "value")
        cache.get("key")
        cache.get("nonexistent")
        stats = cache.get_stats()
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["hit_rate"] == 0.5


class TestDataIntegrity:
    def test_get_returns_copy_of_mutable(self):
        cache = Cache(max_size=100)
        original = {"nested": {"data": [1, 2, 3]}}
        cache.set("key", original)
        retrieved = cache.get("key")
        retrieved["nested"]["data"].append(4)
        second = cache.get("key")
        assert second["nested"]["data"] == [1, 2, 3]

    def test_immutable_values_not_copied(self):
        cache = Cache(max_size=100)
        cache.set("int", 42)
        cache.set("str", "hello")
        cache.set("tuple", (1, 2, 3))
        assert cache.get("int") == 42
        assert cache.get("str") == "hello"
        assert cache.get("tuple") == (1, 2, 3)


class TestThreadSafety:
    def test_concurrent_access(self):
        cache = Cache(max_size=1000)
        errors = []

        def writer():
            try:
                for i in range(100):
                    cache.set(f"key{i}", f"value{i}")
            except Exception as e:
                errors.append(e)

        def reader():
            try:
                for i in range(100):
                    cache.get(f"key{i}")
            except Exception as e:
                errors.append(e)

        threads = []
        for _ in range(5):
            threads.append(threading.Thread(target=writer))
            threads.append(threading.Thread(target=reader))

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestReq1DictionaryStorage:
    @pytest.mark.timeout(5)
    def test_dictionary_lookup_is_o1(self):
        cache = Cache(max_size=10000, default_ttl=3600)
        for i in range(1000):
            cache.set(f"key_{i}", f"value_{i}")
        start = time.time()
        for _ in range(10000):
            cache.get("key_500")
        time_1k = time.time() - start
        for i in range(1000, 5000):
            cache.set(f"key_{i}", f"value_{i}")
        start = time.time()
        for _ in range(10000):
            cache.get("key_2500")
        time_5k = time.time() - start
        ratio = time_5k / time_1k if time_1k > 0.0001 else 100
        assert ratio < 2.0, f"Expected O(1) but got ratio {ratio:.2f}"

    def test_normalized_key_hashable(self):
        cache = Cache(max_size=100)
        key = {"a": [1, 2], "b": {"c": 3}}
        cache.set(key, "value")
        assert cache.get({"a": [1, 2], "b": {"c": 3}}) == "value"
        assert cache.get({"b": {"c": 3}, "a": [1, 2]}) == "value"


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestReq2LRUEvictionOrderedDict:
    @pytest.mark.timeout(5)
    def test_lru_eviction_is_o1(self):
        cache = Cache(max_size=100, default_ttl=3600)
        for i in range(100):
            cache.set(f"key_{i}", f"value_{i}")
        num_evictions = 5000
        start = time.time()
        for i in range(100, 100 + num_evictions):
            cache.set(f"key_{i}", f"value_{i}")
        elapsed = time.time() - start
        assert elapsed < 1.0, f"5000 evictions took {elapsed:.3f}s"

    def test_move_to_end_on_access(self):
        cache = Cache(max_size=3, default_ttl=3600)
        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)
        cache.get("a")
        cache.set("d", 4)
        assert cache.get("a") == 1
        assert cache.get("b") is None


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestReq3TTLHeap:
    @pytest.mark.timeout(5)
    def test_ttl_heap_insertion_log_n(self):
        cache = Cache(max_size=20000, default_ttl=3600)
        num_insertions = 5000
        start = time.time()
        for i in range(num_insertions):
            cache.set(f"key_{i}", f"value_{i}", ttl_seconds=i + 1)
        elapsed = time.time() - start
        assert elapsed < 2.0, f"5000 TTL insertions took {elapsed:.3f}s"

    def test_lazy_cleanup_on_get(self):
        cache = Cache(max_size=100, default_ttl=0.05)
        cache.set("expiring", "value")
        time.sleep(0.1)
        result = cache.get("expiring")
        assert result is None


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestReq4KeyNormalization:
    def test_normalize_key_dict(self):
        cache = Cache(max_size=100)
        cache.set({"z": 1, "a": 2}, "value")
        assert cache.get({"a": 2, "z": 1}) == "value"

    def test_normalize_key_nested(self):
        cache = Cache(max_size=100)
        key = {"outer": {"inner": [1, 2, 3]}}
        cache.set(key, "data")
        assert cache.get({"outer": {"inner": [1, 2, 3]}}) == "data"

    @pytest.mark.timeout(5)
    def test_complex_key_performance(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        num_ops = 2000
        start = time.time()
        for i in range(num_ops):
            key = {"user": i, "data": [i, i + 1]}
            cache.set(key, f"v{i}")
        set_time = time.time() - start
        start = time.time()
        for i in range(num_ops):
            key = {"user": i, "data": [i, i + 1]}
            cache.get(key)
        get_time = time.time() - start
        assert set_time < 1.0, f"Complex key SET took {set_time:.3f}s"
        assert get_time < 1.0, f"Complex key GET took {get_time:.3f}s"


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestReq5StatsLogDeque:
    @pytest.mark.timeout(10)
    def test_stats_log_bounded(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        for i in range(15000):
            cache.set(f"key_{i}", f"value_{i}")
        log = cache.export_stats_log()
        lines = log.split('\n') if log else []
        assert len(lines) <= 10000

    @pytest.mark.timeout(5)
    def test_stats_log_export_fast(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        for i in range(2000):
            cache.set(f"key_{i}", f"value_{i}")
            cache.get(f"key_{i}")
        start = time.time()
        for _ in range(100):
            cache.export_stats_log()
        elapsed = time.time() - start
        assert elapsed < 1.0, f"100 exports took {elapsed:.3f}s"


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestReq6StatisticsSorting:
    @pytest.mark.timeout(5)
    def test_lru_mru_uses_heapq(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        for i in range(3000):
            cache.set(f"key_{i}", f"value_{i}")
        for i in range(0, 3000, 5):
            cache.get(f"key_{i}")
        start = time.time()
        cache.get_lru_entries(10)
        cache.get_mru_entries(10)
        cache.get_most_accessed(10)
        elapsed = time.time() - start
        assert elapsed < 0.5, f"Statistics took {elapsed:.3f}s"


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestReq7MinimalDeepCopy:
    def test_immutable_no_copy(self):
        cache = Cache(max_size=100)
        cache.set("key", "immutable_string")
        val = cache.get("key")
        assert val == "immutable_string"

    def test_mutable_copy_on_get(self):
        cache = Cache(max_size=100)
        original = {"a": [1, 2, 3]}
        cache.set("key", original)
        retrieved = cache.get("key")
        retrieved["a"].append(4)
        second = cache.get("key")
        assert second["a"] == [1, 2, 3]


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestReq8PatternSearchOptimized:
    @pytest.mark.timeout(5)
    def test_prefix_uses_startswith(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        for i in range(2000):
            cache.set(f"user:{i}:data", f"value_{i}")
        start = time.time()
        results = cache.find_by_prefix("user:")
        elapsed = time.time() - start
        assert len(results) == 2000
        assert elapsed < 0.5, f"Prefix search took {elapsed:.3f}s"

    @pytest.mark.timeout(5)
    def test_pattern_uses_regex(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        for i in range(2000):
            cache.set(f"api:v{i % 3}:users:{i}", f"data_{i}")
        start = time.time()
        results = cache.find_by_pattern("api:v?:users:*")
        elapsed = time.time() - start
        assert len(results) == 2000
        assert elapsed < 0.5, f"Pattern search took {elapsed:.3f}s"


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformanceGetOperations:
    @pytest.mark.timeout(5)
    def test_get_operations_throughput(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        for i in range(1000):
            cache.set(f"key_{i}", f"value_{i}")
        num_operations = 5000
        start = time.time()
        for _ in range(5):
            for i in range(1000):
                cache.get(f"key_{i}")
        elapsed = time.time() - start
        ops_per_sec = num_operations / elapsed
        threshold = 50000
        assert ops_per_sec >= threshold, (
            f"GET throughput: {ops_per_sec:,.0f} ops/sec, required: {threshold:,} ops/sec"
        )


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformanceSetOperations:
    @pytest.mark.timeout(5)
    def test_set_operations_throughput(self):
        cache = Cache(max_size=10000, default_ttl=3600)
        num_operations = 3000
        start = time.time()
        for i in range(num_operations):
            cache.set(f"key_{i}", f"value_{i}")
        elapsed = time.time() - start
        ops_per_sec = num_operations / elapsed
        threshold = 30000
        assert ops_per_sec >= threshold, (
            f"SET throughput: {ops_per_sec:,.0f} ops/sec, required: {threshold:,} ops/sec"
        )


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformanceLookupScaling:
    @pytest.mark.timeout(5)
    def test_lookup_time_constant(self):
        cache_small = Cache(max_size=200, default_ttl=3600)
        for i in range(100):
            cache_small.set(f"key_{i}", f"value_{i}")
        start = time.time()
        for _ in range(1000):
            cache_small.get("key_50")
        time_100 = time.time() - start
        cache_large = Cache(max_size=600, default_ttl=3600)
        for i in range(500):
            cache_large.set(f"key_{i}", f"value_{i}")
        start = time.time()
        for _ in range(1000):
            cache_large.get("key_250")
        time_500 = time.time() - start
        ratio = time_500 / time_100 if time_100 > 0.0001 else 100
        assert ratio < 2.5, (
            f"Lookup time ratio (500/100 entries): {ratio:.2f}"
        )


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformanceLRUEviction:
    @pytest.mark.timeout(5)
    def test_eviction_performance(self):
        cache = Cache(max_size=100, default_ttl=3600)
        for i in range(100):
            cache.set(f"key_{i}", f"value_{i}")
        num_evictions = 1000
        start = time.time()
        for i in range(100, 100 + num_evictions):
            cache.set(f"key_{i}", f"value_{i}")
        elapsed = time.time() - start
        assert elapsed < 0.5, (
            f"1000 evictions took {elapsed:.3f}s, required: < 0.5s"
        )


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformanceTTLInsertion:
    @pytest.mark.timeout(5)
    def test_ttl_insertion_performance(self):
        cache = Cache(max_size=10000, default_ttl=3600)
        num_insertions = 2000
        start = time.time()
        for i in range(num_insertions):
            cache.set(f"key_{i}", f"value_{i}", ttl_seconds=i + 1)
        elapsed = time.time() - start
        assert elapsed < 1.0, (
            f"2000 TTL insertions took {elapsed:.3f}s, required: < 1.0s"
        )


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformanceComplexKeys:
    @pytest.mark.timeout(5)
    def test_complex_key_performance(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        num_operations = 1000
        start = time.time()
        for i in range(num_operations):
            key = {"user_id": i, "session": f"sess_{i}", "data": [i, i + 1]}
            cache.set(key, f"value_{i}")
        elapsed_set = time.time() - start
        start = time.time()
        for i in range(num_operations):
            key = {"user_id": i, "session": f"sess_{i}", "data": [i, i + 1]}
            cache.get(key)
        elapsed_get = time.time() - start
        assert elapsed_set < 0.5, (
            f"1000 complex key SETs took {elapsed_set:.3f}s, required: < 0.5s"
        )
        assert elapsed_get < 0.5, (
            f"1000 complex key GETs took {elapsed_get:.3f}s, required: < 0.5s"
        )


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformanceStatsLog:
    @pytest.mark.timeout(5)
    def test_stats_log_export(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        for i in range(500):
            cache.set(f"key_{i}", f"value_{i}")
            cache.get(f"key_{i}")
        start = time.time()
        log = cache.export_stats_log()
        elapsed = time.time() - start
        assert elapsed < 0.1, (
            f"Stats log export took {elapsed:.3f}s, required: < 0.1s"
        )
        assert len(log) > 0


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformanceStatisticsSorting:
    @pytest.mark.timeout(5)
    def test_statistics_sorting_performance(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        for i in range(2000):
            cache.set(f"key_{i}", f"value_{i}")
        for i in range(0, 2000, 10):
            for _ in range(i % 50):
                cache.get(f"key_{i}")
        start = time.time()
        cache.get_lru_entries(10)
        cache.get_mru_entries(10)
        cache.get_most_accessed(10)
        elapsed = time.time() - start
        assert elapsed < 0.2, (
            f"Statistics retrieval took {elapsed:.3f}s, required: < 0.2s"
        )


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformancePatternSearch:
    @pytest.mark.timeout(5)
    def test_pattern_search_performance(self):
        cache = Cache(max_size=5000, default_ttl=3600)
        for i in range(1000):
            cache.set(f"user:{i}:profile", f"data_{i}")
            cache.set(f"session:{i}", f"sess_{i}")
        start = time.time()
        results = cache.find_by_prefix("user:")
        elapsed_prefix = time.time() - start
        assert len(results) == 1000
        start = time.time()
        results = cache.find_by_pattern("user:*:profile")
        elapsed_pattern = time.time() - start
        assert len(results) == 1000
        assert elapsed_prefix < 0.3, (
            f"Prefix search took {elapsed_prefix:.3f}s, required: < 0.3s"
        )
        assert elapsed_pattern < 0.3, (
            f"Pattern search took {elapsed_pattern:.3f}s, required: < 0.3s"
        )


@pytest.mark.skipif(IS_BEFORE, reason="Performance test skipped for unoptimized cache")
class TestPerformanceScaling:
    @pytest.mark.timeout(5)
    def test_scaling_performance(self):
        cache_small = Cache(max_size=500, default_ttl=3600)
        for i in range(200):
            cache_small.set(f"key_{i}", f"value_{i}")
        start = time.time()
        for i in range(200):
            cache_small.get(f"key_{i}")
        time_200 = time.time() - start
        cache_large = Cache(max_size=2000, default_ttl=3600)
        for i in range(1000):
            cache_large.set(f"key_{i}", f"value_{i}")
        start = time.time()
        for i in range(200):
            cache_large.get(f"key_{i}")
        time_1000 = time.time() - start
        ratio = time_1000 / time_200 if time_200 > 0.0001 else 100
        assert ratio < 3.0, (
            f"Time ratio (1000/200 entries): {ratio:.2f}"
        )
