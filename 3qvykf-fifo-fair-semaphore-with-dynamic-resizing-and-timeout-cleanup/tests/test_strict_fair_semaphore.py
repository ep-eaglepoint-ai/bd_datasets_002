import threading
import time
import pytest
from strict_fair_semaphore import StrictFairSemaphore


def run_threads(ts):
    for t in ts:
        t.start()
    for t in ts:
        t.join()


# ---------------- FIFO FAIRNESS ----------------

def test_fifo_order_strict():
    sem = StrictFairSemaphore(1)
    order = []
    acquire_times = []  # Timestamps when each thread acquired
    lock = threading.Lock()

    def worker(i):
        sem.acquire()
        acquire_time = time.monotonic()
        with lock:
            order.append(i)
            acquire_times.append(acquire_time)
        time.sleep(0.02)
        sem.release()

    threads = []
    for i in range(5):
        t = threading.Thread(target=worker, args=(i,))
        threads.append(t)
        t.start()
        time.sleep(0.01)

    for t in threads:
        t.join()
    
    # Verify strict FIFO order
    assert order == [0, 1, 2, 3, 4]
    
    # Verify strict FIFO timing: each acquire must happen at or after the previous one
    assert len(acquire_times) == 5
    for i in range(1, len(acquire_times)):
        assert acquire_times[i] >= acquire_times[i-1], \
            f"Thread {order[i]} acquired at {acquire_times[i]}, but thread {order[i-1]} acquired at {acquire_times[i-1]} - violates FIFO timing"


# ---------------- NO THUNDERING HERD ----------------

def test_single_wakeup_only():
    """
    Verify that only ONE thread wakes up from a single release() call.
    This proves the semaphore prevents "thundering herd" by only notifying
    the head waiter, not all waiters.
    """
    sem = StrictFairSemaphore(1)
    sem.acquire()  # Main thread holds the single slot

    hits = 0
    lock = threading.Lock()
    release_event = threading.Event()  # Signal for workers to release

    def worker():
        nonlocal hits
        sem.acquire()
        with lock:
            hits += 1
        # Wait for signal before releasing (so we can check hits before cleanup)
        release_event.wait()
        sem.release()

    threads = [threading.Thread(target=worker) for _ in range(5)]
    for t in threads:
        t.start()

    # Wait for all threads to block on acquire
    time.sleep(0.1)

    # CRITICAL: Release once and immediately check that only ONE thread woke up
    sem.release()
    time.sleep(0.05)  # Give the woken thread time to acquire and increment hits

    # Verify only ONE thread acquired (not a thundering herd)
    with lock:
        assert hits == 1, f"Expected exactly 1 thread to wake up, but {hits} threads acquired"

    # Now signal workers to release and allow remaining threads to proceed
    release_event.set()
    
    # Wait for all threads to finish
    for t in threads:
        t.join()

    # Final verification: all 5 threads should have eventually acquired
    with lock:
        assert hits == 5, f"Expected all 5 threads to eventually acquire, but only {hits} did"


# ---------------- TIMEOUT CLEANUP ----------------

def test_timeout_removes_waiter():
    sem = StrictFairSemaphore(1)
    sem.acquire()

    def waiter():
        assert sem.acquire(timeout=0.1) is False

    t = threading.Thread(target=waiter)
    t.start()
    t.join()

    # MUST release before main thread can acquire again
    sem.release() 
    assert sem.acquire(timeout=0.1)
    sem.release()


def test_timeout_does_not_leave_ghost_head():
    """
    Stronger timeout-cleanup check:
    - One waiter times out while at the head of the queue.
    - Another waiter is queued behind it.
    - A single release should allow the second waiter to proceed.
    If a ghost entry stayed at the head, the second waiter would never acquire.
    """
    sem = StrictFairSemaphore(1)
    sem.acquire()  # occupy the single slot

    # First waiter will time out and must be fully removed from the queue.
    def head_waiter():
        assert sem.acquire(timeout=0.1) is False

    acquired = []

    # Second waiter is queued behind the first and should succeed after we release once.
    def tail_waiter():
        if sem.acquire(timeout=1.0):
            acquired.append(True)
            sem.release()

    t1 = threading.Thread(target=head_waiter)
    t2 = threading.Thread(target=tail_waiter)

    t1.start()
    # Ensure t1 has time to enqueue before t2
    time.sleep(0.02)
    t2.start()

    t1.join()

    # Now release exactly once; if the head wasn't cleaned up properly, t2 would hang.
    sem.release()
    t2.join(timeout=1.5)

    assert acquired == [True]


# ---------------- TIMEOUT VS RELEASE RACE ----------------

def test_timeout_release_race_safe():
    sem = StrictFairSemaphore(1)
    sem.acquire()

    result = []

    def waiter():
        result.append(sem.acquire(timeout=0.2))

    t = threading.Thread(target=waiter)
    t.start()

    time.sleep(0.18)
    sem.release()
    t.join()

    assert len(result) == 1
    assert result[0] is True # Waiter caught it
    
    # Waiter never released, so WE must release before next acquire
    sem.release() 
    assert sem.acquire(timeout=0.1)
    sem.release()


# ---------------- RELEASE OVERFLOW ----------------

def test_release_overflow_protection():
    sem = StrictFairSemaphore(1)
    sem.acquire()
    sem.release()

    with pytest.raises(RuntimeError):
        sem.release()


# ---------------- RESIZE UP ----------------

def test_resize_increase_unblocks():
    sem = StrictFairSemaphore(1)
    sem.acquire()

    unlocked = []

    def waiter():
        sem.acquire()
        unlocked.append(True)
        sem.release()

    t = threading.Thread(target=waiter)
    t.start()

    time.sleep(0.05)
    sem.resize(2)

    t.join(timeout=1)
    assert unlocked == [True]


# ---------------- RESIZE DOWN (THROTTLE) ----------------

def test_resize_down_throttles():
    sem = StrictFairSemaphore(3)
    sem.acquire()
    sem.acquire()
    sem.acquire()

    sem.resize(1)

    acquired = []

    def waiter():
        if sem.acquire(timeout=0.2):
            acquired.append(True)
            sem.release()

    t = threading.Thread(target=waiter)
    t.start()

    time.sleep(0.1)
    sem.release() # in_use goes 3->2. Still blocked (2 > 1)
    assert acquired == []

    sem.release() # in_use goes 2->1. Still blocked (1 == 1)
    assert acquired == []
    
    sem.release() # in_use goes 1->0. Head proceeds!
    t.join(timeout=1)
    assert acquired == [True]


# ---------------- O(1) AVERAGE WAIT TIME ----------------

def test_average_wait_time_ring_buffer():
    sem = StrictFairSemaphore(1)
    sem.acquire()

    def worker():
        sem.acquire()
        sem.release()

    threads = []
    for _ in range(50):
        t = threading.Thread(target=worker)
        threads.append(t)
        t.start()
        time.sleep(0.005) # Force queueing

    time.sleep(0.1)
    # Release ONCE to start the chain of FIFO acquisitions/releases
    sem.release() 

    for t in threads:
        t.join()

    avg = sem.get_average_wait_time()
    assert avg > 0
    assert avg < 1


def test_average_wait_time_concurrent_access():
    """
    Requirement 6: Stress test concurrent access to the circular buffer.
    Multiple worker threads contend for the semaphore while reader threads
    call get_average_wait_time() in parallel, exercising _metrics_lock.
    """
    sem = StrictFairSemaphore(3)
    stop = False

    def worker():
        # Lots of short acquires/releases to generate wait times
        for _ in range(200):
            if sem.acquire(timeout=1):
                time.sleep(0.001)
                sem.release()

    reader_errors = []

    def reader():
        # Continuously read the average while workers run
        while not stop:
            try:
                avg = sem.get_average_wait_time()
                # Just basic sanity: average should be finite and non-negative
                assert avg >= 0
            except Exception as e:
                reader_errors.append(e)
                break

    workers = [threading.Thread(target=worker) for _ in range(10)]
    readers = [threading.Thread(target=reader) for _ in range(5)]

    for t in workers + readers:
        t.start()

    for t in workers:
        t.join()

    # Signal readers to stop and wait for them
    stop = True
    for t in readers:
        t.join(timeout=1)

    # If _metrics_lock did not correctly protect the buffer, we'd likely see
    # exceptions (index errors, division by zero, etc.) captured here.
    assert reader_errors == []


# ---------------- STRESS TEST ----------------

def test_stress_no_deadlock():
    sem = StrictFairSemaphore(5)

    def worker():
        for _ in range(100):
            if sem.acquire(timeout=1):
                time.sleep(0.001)
                sem.release()

    threads = [threading.Thread(target=worker) for _ in range(50)]
    run_threads(threads)

    assert sem.acquire(timeout=0.1)
    sem.release()
