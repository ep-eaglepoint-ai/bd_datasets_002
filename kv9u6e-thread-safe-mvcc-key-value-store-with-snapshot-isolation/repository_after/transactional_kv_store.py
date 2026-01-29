import threading
import time
from typing import Any, Dict, List, Optional, Tuple

class WriteConflictError(Exception):
    pass

Version = Tuple[int, Any]  # (commit_ts, value)

class TransactionalKVStore:
    """
    Thread-safe MVCC key-value store with snapshot isolation.

    Uses a write lock for state-changing operations (put, commit, vacuum, rollback)
    while allowing lock-free reads for non-blocking concurrency.
    """
    def __init__(self) -> None:
        self._write_lock = threading.Lock()  # Only for state-changing operations
        self._tid_counter = 0
        self._commit_counter = 0
        self._versions: Dict[str, List[Version]] = {}
        self._active: Dict[int, bool] = {}
        self._writes: Dict[int, Dict[str, Any]] = {}

    def begin_transaction(self) -> int:
        with self._write_lock:
            self._tid_counter += 1
            tid = self._tid_counter
            self._active[tid] = True
            self._writes[tid] = {}
            return tid

    def _latest_commit(self, key: str) -> Optional[Version]:
        versions = self._versions.get(key, [])
        return versions[-1] if versions else None

    def put(self, tid: int, key: str, value: Any) -> None:
        with self._write_lock:
            if tid not in self._active:
                raise ValueError("Transaction not active")
            latest = self._latest_commit(key)
            if latest and latest[0] > tid:
                raise WriteConflictError("Write-write conflict")
            self._writes[tid][key] = value

    def get(self, tid: int, key: str) -> Any:
        # Lock-free read: does not block writers (requirement #5)
        # Python's GIL ensures atomic dict/list access for snapshot reads
        if tid not in self._active:
            raise ValueError("Transaction not active")
        # check uncommitted write for this tid
        writes = self._writes.get(tid, {})
        if key in writes:
            return writes[key]
        versions = self._versions.get(key, [])
        # find latest commit <= tid (snapshot isolation)
        for commit_ts, val in reversed(versions):
            if commit_ts <= tid:
                return val
        return None

    def commit(self, tid: int) -> bool:
        with self._write_lock:
            if tid not in self._active:
                return False
            # assign commit timestamp atomically
            self._commit_counter = max(self._commit_counter, tid)
            commit_ts = tid
            # apply writes
            for key, val in self._writes[tid].items():
                self._versions.setdefault(key, []).append((commit_ts, val))
            # cleanup
            del self._writes[tid]
            del self._active[tid]
            return True

    def rollback(self, tid: int) -> None:
        with self._write_lock:
            if tid in self._writes:
                del self._writes[tid]
            if tid in self._active:
                del self._active[tid]

    def vacuum(self) -> None:
        with self._write_lock:
            if self._active:
                watermark = min(self._active.keys())
            else:
                watermark = self._commit_counter
            for key, versions in list(self._versions.items()):
                # keep newest version <= watermark, drop older
                kept: List[Version] = []
                for v in versions:
                    if v[0] >= watermark:
                        kept.append(v)
                # also keep newest older than watermark for visibility
                older = [v for v in versions if v[0] < watermark]
                if older:
                    kept.insert(0, older[-1])
                self._versions[key] = kept

if __name__ == "__main__":
    store = TransactionalKVStore()
    errors = []
    def worker(idx: int):
        try:
            tid = store.begin_transaction()
            store.put(tid, "x", idx)
            time.sleep(0.01)
            store.commit(tid)
        except WriteConflictError:
            errors.append(idx)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    final_tid = store.begin_transaction()
    val = store.get(final_tid, "x")
    store.rollback(final_tid)
    print("Final value:", val)
    print("Conflicts:", len(errors))



