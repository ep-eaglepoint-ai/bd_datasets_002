import threading
import time
from typing import Dict

import pytest

from connection_pool.core import ConnectionPool


def test_stress_many_threads_contending():
    """Spawn many threads contending for the pool and validate invariants.

    - Assert that the factory never creates more than `max_connections`.
    - Ensure all threads complete (no deadlock).
    - Validate stats consistency after the run.
    """
    min_conn = 3
    max_conn = 10
    num_threads = 50
    iterations_per_thread = 20

    created: Dict[str, int] = {"count": 0}
    created_lock = threading.Lock()

    def factory():
        with created_lock:
            created["count"] += 1
        # return a distinct object per connection
        return object()

    pool = ConnectionPool(min_conn, max_conn, factory)

    start_event = threading.Event()
    errors = []
    acquisitions = 0
    acq_lock = threading.Lock()

    def worker(tid: int):
        nonlocal acquisitions
        try:
            start_event.wait()
            for _ in range(iterations_per_thread):
                pc = pool.acquire(timeout=2.0)
                # simulate small work
                time.sleep(0.001)
                pool.release(pc)
                with acq_lock:
                    acquisitions += 1
        except Exception as exc:  # collect any exceptions
            errors.append((tid, exc))

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(num_threads)]
    for t in threads:
        t.start()

    # Start all workers
    start_event.set()

    # Wait for completion with a generous timeout to detect deadlocks
    for t in threads:
        t.join(timeout=30.0)

    alive = [t for t in threads if t.is_alive()]
    assert not alive, f"Deadlock detected: {len(alive)} threads still alive"
    assert not errors, f"Worker errors occurred: {errors}"

    # Factory should never have created more than max_conn
    assert created["count"] <= max_conn

    # Stats consistency: total_created <= max_conn and counts add up
    s = pool.stats()
    assert s["total_created"] <= max_conn
    assert s["current_pool_size"] == s["total_created"]
    assert s["available_count"] + s["in_use_count"] == s["current_pool_size"]
    # All threads finished, so no connections should be in-use
    assert s["in_use_count"] == 0
    # Ensure the pool recorded at least as many acquisitions as we performed
    assert s["total_acquisitions"] >= acquisitions
