# Development Trajectory

## Task: Async Resilient Chunked AI Analysis

### Phase 1: Analysis

**Problem:**
- Synchronous monolith document analysis service blocks FastAPI worker pool
- Large documents (10MB+) trigger 504 Gateway Timeouts
- No progress visibility, no error resilience, no retry mechanism
- All-or-nothing processing model loses work on failure

**Original Code Issues:**
- `time.sleep()` blocks the event loop
- Single synchronous `call_ai_provider()` for entire document
- No chunking, no background processing
- No state tracking or progress reporting

### Phase 2: Design

**Architecture:**
1. **Immediate Response**: POST returns 202 Accepted with job_id
2. **Background Processing**: `asyncio.create_task()` for non-blocking orchestration
3. **Chunking**: Configurable `max_chunk_chars` splits document
4. **Retry**: Exponential backoff (3 attempts per chunk)
5. **State Machine**: PENDING -> PROCESSING -> COMPLETED | FAILED | PARTIAL_SUCCESS
6. **Atomic Counters**: Row-level locking via `SELECT ... FOR UPDATE`
7. **Isolated Sessions**: `get_background_db()` for background tasks

**Database Schema:**
- `AnalysisJob`: status, total_chunks, chunks_completed, chunks_failed, error_summary
- `ChunkRecord`: job_id, chunk_index, status, result, error, retries

### Phase 3: Implementation

**Files Modified (repository_before → repository_after):**
- `database.py`: Added `get_db()`, `get_background_db()`, migrated to `DeclarativeBase`
- `models.py`: Added `JobStatus`/`ChunkStatus` enums, status/chunk tracking columns, `ChunkRecord` model with ForeignKey relationship
- `main.py`: Converted sync endpoint to async 202 Accepted pattern, added `GET /v1/analyze/{job_id}`, background task via `asyncio.create_task()`

**Files Added:**
- `schemas.py`: Pydantic request/response models
- `ai_provider.py`: Async simulated AI with latency/flakiness
- `processor.py`: chunk_text(), process_single_chunk(), process_job(), _finalize_job()
- `alembic_migration.py`: Logical migration SQL (ALTER TABLE + CREATE TABLE)

### Phase 4: Testing

**Test Categories:**

1. **POST Endpoint** (3 tests) - 202 status, job_id, PENDING state
2. **Chunking** (6 tests) - Basic, exact division, single, empty, one char, stored param
3. **Retry Logic** (3 tests) - MAX_RETRIES >= 3, fail after retries, success on first try
4. **Atomic Counters** (3 tests) - Increment completed, failed, multiple increments
5. **State Machine** (5 tests) - PENDING, COMPLETED, FAILED, PARTIAL_SUCCESS, valid values
6. **GET Endpoint** (4 tests) - Status+progress, 404, chunk errors, 100% progress
7. **Ordered Reassembly** (2 tests) - Correct order, partial results ordered
8. **DB Isolation** (2 tests) - New sessions, independent of request
9. **Alembic Migration** (9 tests) - SQL content validation, callable functions
10. **Integration** (2 tests) - <100ms response, full pipeline with mock
11. **Adversarial** (3 tests) - One chunk fails, all fail, error summary populated

### Phase 5: Verification

**Results:**
- All 42 tests pass on `repository_after`
- 40 tests fail on `repository_before`, 2 pass (FAIL_TO_PASS: 40, PASS_TO_PASS: 2)
- POST returns 202 in under 100ms for 10KB documents
- Retry with exponential backoff verified
- Atomic counter updates via row-level locking
- Ordered reassembly verified with out-of-order chunk insertion
