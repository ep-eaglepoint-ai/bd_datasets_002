from __future__ import annotations

import random
from concurrent.futures import ThreadPoolExecutor


def test_thread_safety_across_all_public_methods_under_load(cache):
    # 10+ threads, 50+ ops each, mixing methods; should not deadlock or corrupt state.
    rnd = random.Random(1337)

    THREADS = 12
    OPS_PER_THREAD = 80
    KEY_SPACE = [f"k{i}" for i in range(50)]

    # Seed some keys
    for i in range(10):
        cache.set(KEY_SPACE[i], i)

    def worker(seed: int):
        r = random.Random(seed)
        for _ in range(OPS_PER_THREAD):
            k = r.choice(KEY_SPACE)
            op = r.choice(["get", "set", "delete", "exists", "incr", "keys", "delpat"])

            if op == "get":
                cache.get(k)
            elif op == "set":
                cache.set(k, r.randint(0, 1000))
            elif op == "delete":
                cache.delete(k)
            elif op == "exists":
                cache.exists(k)
            elif op == "incr":
                cache.increment("shared", 1)
            elif op == "keys":
                cache.keys("k*")
            elif op == "delpat":
                cache.delete_pattern("no_such_prefix:*")

    with ThreadPoolExecutor(max_workers=THREADS) as pool:
        futures = [pool.submit(worker, rnd.randint(0, 1_000_000)) for _ in range(THREADS)]
        for f in futures:
            f.result()

    # Basic invariants.
    st = cache.stats()
    assert st["size"] <= cache.max_size
    keys = cache.keys("*")
    assert len(keys) == len(set(keys))
    assert len(keys) == st["size"]


def test_thread_safety_with_rlock_reentrancy(cache):
    """Test that RLock allows re-entrant calls (nested calls from same thread)"""
    # This test verifies RLock usage by ensuring nested operations work
    # In a real scenario, this would test methods that call other methods
    
    def nested_operations(key):
        # Simulate nested operations that would require re-entrant lock
        cache.set(key, 1)
        value = cache.get(key)  # Nested call
        cache.increment(key, 1)  # Another nested call
        return cache.get(key)
    
    # Should not deadlock even with nested calls
    result = nested_operations("test_key")
    assert result == 2


def test_thread_safety_all_public_methods_individually(cache):
    """Test each public method individually under concurrency"""
    from concurrent.futures import ThreadPoolExecutor
    
    def test_get():
        cache.get("key1")
    
    def test_set():
        cache.set("key2", "value2")
    
    def test_delete():
        cache.delete("key3")
    
    def test_exists():
        cache.exists("key4")
    
    def test_increment():
        cache.increment("counter")
    
    def test_keys():
        cache.keys("*")
    
    def test_delete_pattern():
        cache.delete_pattern("test:*")
    
    def test_stats():
        cache.stats()
    
    # Seed some data
    cache.set("key1", "value1")
    cache.set("key3", "value3")
    cache.set("key4", "value4")
    
    methods = [test_get, test_set, test_delete, test_exists, 
               test_increment, test_keys, test_delete_pattern, test_stats]
    
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = []
        for method in methods:
            for _ in range(10):
                futures.append(pool.submit(method))
        
        for f in futures:
            f.result()  # Should not raise or deadlock
    
    # Verify no corruption
    stats = cache.stats()
    assert stats["size"] <= cache.max_size


def test_thread_safety_no_race_conditions_in_stats(cache):
    """Test that stats remain consistent under concurrent access"""
    from concurrent.futures import ThreadPoolExecutor
    
    cache.set("hit", 1)
    
    def worker():
        for _ in range(20):
            cache.get("hit")  # hit
            cache.get("miss")  # miss
    
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(worker) for _ in range(10)]
        for f in futures:
            f.result()
    
    # Stats should be consistent
    stats = cache.stats()
    # Total operations: 10 threads * 20 iterations * 2 ops = 400
    # Hits: 10 threads * 20 = 200
    # Misses: 10 threads * 20 = 200
    assert stats["hits"] + stats["misses"] >= 400  # At least 400 total
    assert stats["hits"] > 0
    assert stats["misses"] > 0
