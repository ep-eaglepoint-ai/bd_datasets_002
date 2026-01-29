from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor

import pytest


def test_increment_initializes_missing_key_to_amount(cache):
    assert cache.increment("counter", amount=5) == 5
    assert cache.get("counter") == 5


def test_decrement_is_negative_increment(cache):
    cache.set("n", 10)
    assert cache.decrement("n", amount=3) == 7
    assert cache.get("n") == 7


def test_increment_non_numeric_raises_value_error(cache):
    cache.set("s", "not-a-number")
    with pytest.raises(ValueError):
        cache.increment("s")


def test_atomic_increment_multi_thread(cache):
    THREADS = 10
    ITERS = 100

    def worker():
        for _ in range(ITERS):
            cache.increment("counter")

    with ThreadPoolExecutor(max_workers=THREADS) as pool:
        futures = [pool.submit(worker) for _ in range(THREADS)]
        for f in futures:
            f.result()

    assert cache.get("counter") == THREADS * ITERS


def test_stats_are_accurate_under_concurrent_gets(cache):
    # Deterministic concurrency: we know exactly how many hits/misses happen.
    cache.set("hit", 1)

    THREADS = 10
    HITS_PER_THREAD = 50
    MISSES_PER_THREAD = 50

    before = cache.stats()

    def worker():
        for _ in range(HITS_PER_THREAD):
            assert cache.get("hit") == 1
        for _ in range(MISSES_PER_THREAD):
            assert cache.get("miss") is None

    with ThreadPoolExecutor(max_workers=THREADS) as pool:
        futures = [pool.submit(worker) for _ in range(THREADS)]
        for f in futures:
            f.result()

    after = cache.stats()
    assert after["hits"] == before["hits"] + (THREADS * HITS_PER_THREAD)
    assert after["misses"] == before["misses"] + (THREADS * MISSES_PER_THREAD)


@pytest.mark.asyncio
async def test_mixed_concurrent_operations_do_not_corrupt_state(cache):
    # Uses pytest-asyncio to orchestrate concurrency; actual work happens in threads.
    async def writer(i: int):
        await asyncio.to_thread(cache.set, f"k{i}", i)

    async def reader(i: int):
        # Some hits, some misses.
        _ = await asyncio.to_thread(cache.get, f"k{i}")
        _ = await asyncio.to_thread(cache.get, f"missing:{i}")

    async def incr(i: int):
        for _ in range(50):
            await asyncio.to_thread(cache.increment, "shared", 1)

    tasks = []
    for i in range(50):
        tasks.append(writer(i))
        tasks.append(reader(i))
    for i in range(10):
        tasks.append(incr(i))

    await asyncio.gather(*tasks)

    stats = cache.stats()
    assert stats["size"] <= cache.max_size
    assert cache.get("shared") == 10 * 50


def test_increment_with_different_amounts(cache):
    """Test increment with various amounts"""
    assert cache.increment("counter", amount=5) == 5
    assert cache.increment("counter", amount=10) == 15
    assert cache.increment("counter", amount=-3) == 12
    assert cache.increment("counter", amount=0) == 12


def test_increment_on_float_values(cache):
    """Test increment works with float values"""
    cache.set("float_val", 5.5)
    assert cache.increment("float_val", amount=2.5) == 8.0
    assert cache.get("float_val") == 8.0


def test_increment_then_decrement(cache):
    """Test increment followed by decrement"""
    assert cache.increment("counter", amount=10) == 10
    assert cache.decrement("counter", amount=3) == 7
    assert cache.decrement("counter", amount=2) == 5
    assert cache.get("counter") == 5


def test_increment_on_list_raises_value_error(cache):
    """Test increment on list raises ValueError"""
    cache.set("list_val", [1, 2, 3])
    with pytest.raises(ValueError):
        cache.increment("list_val")


def test_increment_on_dict_raises_value_error(cache):
    """Test increment on dict raises ValueError"""
    cache.set("dict_val", {"a": 1})
    with pytest.raises(ValueError):
        cache.increment("dict_val")


def test_increment_on_none_raises_value_error(cache):
    """Test increment on None raises ValueError"""
    cache.set("none_val", None)
    with pytest.raises(ValueError):
        cache.increment("none_val")


def test_concurrent_increment_with_different_amounts(cache):
    """Test concurrent increments with different amounts"""
    from concurrent.futures import ThreadPoolExecutor
    
    def worker_add_5():
        for _ in range(10):
            cache.increment("counter", amount=5)
    
    def worker_add_10():
        for _ in range(10):
            cache.increment("counter", amount=10)
    
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = []
        for _ in range(3):
            futures.append(pool.submit(worker_add_5))
        for _ in range(2):
            futures.append(pool.submit(worker_add_10))
        
        for f in futures:
            f.result()
    
    # Expected: 3 threads * 10 iterations * 5 = 150
    #           2 threads * 10 iterations * 10 = 200
    #           Total = 350
    assert cache.get("counter") == 350



