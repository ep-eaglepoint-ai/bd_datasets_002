# Development Trajectory

## Task: Thread-Safe MVCC Key-Value Store (Python)

### Phase 1: Analysis
- Need MVCC with snapshot isolation and write-write conflict detection.
- Transactions identified by monotonically increasing TIDs.
- Reads must see only versions committed before transaction start.
- Vacuum must prune versions older than global watermark.

### Phase 2: Design
- Version chains per key: list of (commit_ts, value).
- Transaction state tracking: active TIDs and pending writes.
- Commit assigns timestamp atomically (commit_ts = TID for snapshot isolation).
- Write conflicts checked on put against newer committed versions.

### Phase 3: Implementation
- Implemented TransactionalKVStore with begin_transaction, put, get, commit, rollback, vacuum.
- Thread safety via RLock.
- Added deterministic concurrency demo in __main__ block.

### Phase 4: Testing
- Unit tests for snapshot isolation, conflicts, rollback, vacuum, thread safety.
- All tests run via pytest with clean summary output.

### Phase 5: Verification
- Docker test run prints summary only.
- Evaluation generates timestamped report.json.

### Outcome
- MVCC store is thread-safe, snapshot-correct, and conflict-detecting.
- Vacuum prunes stale versions based on active transaction watermark.
