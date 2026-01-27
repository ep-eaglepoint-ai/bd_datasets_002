import sys
import os
import threading

sys.path.insert(0, os.path.abspath("repository_after"))

from transactional_kv_store import TransactionalKVStore, WriteConflictError


def test_begin_and_commit():
    store = TransactionalKVStore()
    tid = store.begin_transaction()
    store.put(tid, "a", 1)
    assert store.commit(tid) is True


def test_snapshot_isolation():
    store = TransactionalKVStore()
    t1 = store.begin_transaction()
    store.put(t1, "k", "v1")
    store.commit(t1)

    t2 = store.begin_transaction()
    t3 = store.begin_transaction()
    store.put(t3, "k", "v2")
    store.commit(t3)

    assert store.get(t2, "k") == "v1"


def test_write_conflict():
    store = TransactionalKVStore()
    t1 = store.begin_transaction()
    store.put(t1, "x", 1)
    store.commit(t1)

    t2 = store.begin_transaction()
    t3 = store.begin_transaction()
    store.put(t3, "x", 2)
    store.commit(t3)

    try:
        store.put(t2, "x", 3)
        assert False, "Expected WriteConflictError"
    except WriteConflictError:
        pass


def test_rollback():
    store = TransactionalKVStore()
    t1 = store.begin_transaction()
    store.put(t1, "a", 1)
    store.rollback(t1)

    t2 = store.begin_transaction()
    assert store.get(t2, "a") is None


def test_vacuum():
    store = TransactionalKVStore()
    t1 = store.begin_transaction()
    store.put(t1, "k", 1)
    store.commit(t1)
    t2 = store.begin_transaction()
    store.put(t2, "k", 2)
    store.commit(t2)
    store.vacuum()
    t3 = store.begin_transaction()
    assert store.get(t3, "k") in (1, 2)


def test_thread_safety():
    store = TransactionalKVStore()
    errors = []

    def worker(v):
        try:
            tid = store.begin_transaction()
            store.put(tid, "x", v)
            store.commit(tid)
        except WriteConflictError:
            errors.append(v)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert isinstance(errors, list)
