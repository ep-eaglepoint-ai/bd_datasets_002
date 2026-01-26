import threading
import time
import pytest
from fair_semaphore import FairSemaphore


def run_threads(ts):
    for t in ts:
        t.start()
    for t in ts:
        t.join()


# ---------------- FIFO FAIRNESS ----------------

def test_fifo_order_strict():
    sem = FairSemaphore(1)
    order = []

    def worker(i):
        sem.acquire()
        order.append(i)
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
    assert order == [0, 1, 2, 3, 4]


# ---------------- NO THUNDERING HERD ----------------

def test_single_wakeup_only():
    sem = FairSemaphore(1)
    sem.acquire()

    hits = 0
    lock = threading.Lock()

    def worker():
        nonlocal hits
        sem.acquire()
        with lock:
            hits += 1
        time.sleep(0.05)
        sem.release()

    threads = [threading.Thread(target=worker) for _ in range(5)]
    for t in threads:
        t.start()

    # Wait for threads to block on acquire
    time.sleep(0.1)
    sem.release()

    # With per-waiter notify, only one thread wakes.
    # We wait long enough to ensure it hasn't released yet.
    time.sleep(0.02) 
    with lock:
        assert hits == 1
    
    # Cleanup: release remaining 4
    for _ in range(4):
        sem.release()
        time.sleep(0.01)
    for t in threads:
        t.join()


# ---------------- TIMEOUT CLEANUP ----------------

def test_timeout_removes_waiter():
    sem = FairSemaphore(1)
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


# ---------------- TIMEOUT VS RELEASE RACE ----------------

def test_timeout_release_race_safe():
    sem = FairSemaphore(1)
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
    sem = FairSemaphore(1)
    sem.acquire()
    sem.release()

    with pytest.raises(RuntimeError):
        sem.release()


# ---------------- RESIZE UP ----------------

def test_resize_increase_unblocks():
    sem = FairSemaphore(1)
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
    sem = FairSemaphore(3)
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
    sem = FairSemaphore(1)
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


# ---------------- STRESS TEST ----------------

def test_stress_no_deadlock():
    sem = FairSemaphore(5)

    def worker():
        for _ in range(100):
            if sem.acquire(timeout=1):
                time.sleep(0.001)
                sem.release()

    threads = [threading.Thread(target=worker) for _ in range(50)]
    run_threads(threads)

    assert sem.acquire(timeout=0.1)
    sem.release()
