git add # Trajectory Report: LSM-Tree SSTable Implementation

## 1. Audit the Original Code (Identify Problems)

The baseline `repository_before/` was empty, requiring a complete implementation of an LSM-Tree SSTable storage layer. The test suite in `tests/` and problem statement revealed critical requirements: binary format `[KeyLen][Key][ValLen][Val]`, sparse indexing every Nth key, footer with offsets and magic number, and a bitset-based Bloom Filter. The primary failure mode identified was offset mismanagement—indexes pointing to mid-record positions rather than record headers. The problem statement emphasized the sequencing paradox of constructing a footer that must contain pointers to variable-length sections, requiring precise byte counting.

**Root Cause Analysis**: The absence of offset tracking during serialization would lead to incorrect sparse index entries. Without explicit byte cursor management, implementations often miscalculate positions, causing readers to seek into the middle of records.

**Reference**: [Log-Structured Merge-Trees](https://www.cs.umb.edu/~poneil/lsmtree.pdf), [Designing Data-Intensive Applications](https://dataintensive.net/)

## 2. Define a Refactoring Contract

**Functional Contract**: `MemTable.FlushToSSTable(filename, sparseIndexInterval)` must: (a) snapshot state under RLock, (b) write entries as `[KeyLen(uint32 LE)][Key][ValLen(uint32 LE)][Val]`, (c) build Bloom Filter over all keys, (d) sample every Nth key for sparse index, (e) append footer `[BloomFilterOffset(uint64 LE)][SparseIndexOffset(uint64 LE)][MagicNumber(uint32 LE)]`.

**Determinism Contract**: Given identical inputs and `sparseIndexInterval`, output files must be byte-identical for test reproducibility.

**Concurrency Contract**: MemTable uses `sync.RWMutex`; `Put` requires `Lock`, `FlushToSSTable` uses `RLock` to allow concurrent reads during flush.

**Endianness Contract**: All binary fields use `binary.LittleEndian` consistently via `encoding/binary`.

**Reference**: [Design by Contract](https://martinfowler.com/bliki/DesignByContract.html), [encoding/binary package](https://pkg.go.dev/encoding/binary)

## 3. Map Issue Statement to Code and Tests

The problem statement identified three critical failure modes:
1. **Offset Mismanagement**: Tests verify offsets point to `KeyLength` field start (REQ-7)
2. **Footer Sequencing Paradox**: Footer must contain offsets to sections written after data, requiring careful position tracking
3. **Bloom Filter Implementation**: Must use bitset with bitwise ops, not map/array (REQ-4)

Test failures would manifest as: incorrect sparse index lookups, footer parsing errors, or Bloom Filter false negatives. The evaluation harness (`evaluation/evaluation.go`) validates all 8 requirements programmatically.

**Reference**: [Root Cause Analysis](https://www.atlassian.com/incident-management/postmortem/root-cause-analysis)

## 4. Analyze Instance and Dependency Structure

**MemTable Structure**: Simple `map[string][]byte` with `sync.RWMutex`, avoiding complex data structures not required by tests. Entries are sorted lexicographically during flush to ensure deterministic ordering.

**Flush Flow**: (1) Acquire RLock, (2) Collect sorted entries, (3) Stream to disk via `bufio.Writer`, (4) Track `currentOffset` for each record, (5) Write Bloom Filter, (6) Write sparse index, (7) Write footer with offsets.

**Reader Structure**: `SSTableReader` reconstructs in-memory structures from footer: read footer → validate magic → read Bloom Filter → read sparse index → enable `Get` operations.

**Dependency Isolation**: No global state, no network calls, no time-based logic. All behavior is deterministic based on input data.

**Reference**: [Separation of Concerns](https://martinfowler.com/bliki/SeparationOfConcerns.html)

## 5. Evaluate Test Strategy

**Test Coverage**: Tests validate binary format (REQ-1), sparse index sampling (REQ-2), footer structure (REQ-3), Bloom Filter bitset (REQ-4), bufio usage (REQ-5), endianness (REQ-6), offset correctness (REQ-7), and concurrency safety (REQ-8).

**Test Isolation**: Each test uses `t.TempDir()` for file isolation. No shared state between tests.

**Edge Cases Covered**: Empty MemTable, large datasets, various key/value sizes, unicode keys, concurrent operations during flush.

**Gaps Identified**: Tests verify functionality but could add more adversarial cases (corrupted files, invalid offsets, malformed footer). However, current coverage is sufficient for requirement validation.

**Reference**: [Test Isolation](https://martinfowler.com/articles/mocksArentStubs.html), [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html)

## 6. Reason About Refactor Approach

**High-Level Solution**:
- **Explicit Offset Tracking**: Maintain `currentOffset` counter updated immediately after each write, ensuring sparse index entries point to record headers
- **Stable Boundaries**: Use `bufio.Writer` for all writes, query file position only for reading offsets, never mix buffered/unbuffered writes
- **Deterministic Serialization**: Sort entries before writing, use consistent endianness, avoid reflection-based encoding
- **Self-Describing Format**: Footer acts as root of truth; readers reconstruct structures from footer offsets

**Verification Strategy**: 
- Tests validate round-trip correctness (write → read → compare)
- Evaluation harness checks low-level binary properties
- Manual inspection possible via `hexdump` due to explicit binary format

**Reference**: [Explicit vs Implicit Design](https://peps.python.org/pep-0020/)

## 7. Verification and Validation Thinking

**Deterministic Behavior**: Same inputs produce identical outputs, enabling reliable testing and evaluation.

**Offset Correctness**: Sparse index offsets verified to point to `KeyLength` field start by seeking and reading length prefix.

**Bloom Filter Correctness**: Bitset implementation verified through direct inspection of bitset bytes and bitwise operation testing.

**Concurrency Safety**: RLock allows concurrent reads during flush; tests verify no data corruption under concurrent writes.

**File Structure Validation**: Footer magic number, offset ranges, and section boundaries all validated programmatically.

**Reference**: [Verification Mindset](https://martinfowler.com/bliki/TestPyramid.html)

## 8. Result: Measurable Gains

All 8 requirements pass validation. The implementation is:
- **Deterministic**: Byte-stable output for identical inputs
- **Correct**: Offsets point to record headers, footer is valid, Bloom Filter works
- **Efficient**: Sparse index enables bounded seeks, Bloom Filter provides fast rejection
- **Safe**: Concurrency controlled via RWMutex, no data races
- **Maintainable**: Clear separation of concerns, explicit offset tracking, self-documenting structure

The solution follows LSM-Tree best practices while remaining minimal and testable.

## Trajectory Transferability

The **Audit → Contract → Design → Execute → Verify** structure applies universally:
- **Refactoring Tests**: Audit flaky tests → define isolation contract → redesign fixtures → execute → verify stability
- **Performance Optimization**: Audit hotspots → define SLOs → redesign paths → implement → verify benchmarks
- **Full-Stack Development**: Audit UX flows → define API contracts → design interfaces → implement → verify integration

The core principle remains: **Audit → Contract → Design → Execute → Verify**. Only the artifacts and metrics change.
