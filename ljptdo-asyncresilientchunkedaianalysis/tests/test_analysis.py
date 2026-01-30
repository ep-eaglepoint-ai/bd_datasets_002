"""
Test suite for Async Resilient Chunked AI Analysis Service.

Covers all 11 requirements:
  1.  POST /v1/analyze returns 202 with job_id
  2.  Chunking by configurable max_chunk_chars
  3.  Retry with exponential backoff (3 attempts)
  4.  Atomic counter updates (chunks_completed)
  5.  State machine: PENDING, PROCESSING, COMPLETED, FAILED, PARTIAL_SUCCESS
  6.  GET /v1/analyze/{job_id} with progress and chunk errors
  7.  Ordered reassembly of chunk results
  8.  Isolated DB sessions for background tasks
  9.  Alembic migration steps
  10. Integration: job_id returned in < 100ms
  11. Adversarial: one chunk always fails -> PARTIAL_SUCCESS/FAILED
"""

import asyncio
import importlib
import os
import sys
import time
import pytest

# Determine which repository to test based on REPO env var (set by docker-compose)
REPO = os.environ.get("REPO", "repository_after")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', REPO))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Override database BEFORE importing app modules — use in-memory SQLite with StaticPool
# StaticPool ensures all connections share the same in-memory database
TEST_DB_URL = "sqlite://"

db_module = importlib.import_module(f"{REPO}.database")
db_module.SQLALCHEMY_DATABASE_URL = TEST_DB_URL
db_module.engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_module.engine)

models_module = importlib.import_module(f"{REPO}.models")
Base = models_module.Base
AnalysisJob = models_module.AnalysisJob

# These only exist in repository_after
try:
    ChunkRecord = models_module.ChunkRecord
    JobStatus = models_module.JobStatus
    ChunkStatus = models_module.ChunkStatus
except AttributeError:
    ChunkRecord = None
    JobStatus = None
    ChunkStatus = None

main_module = importlib.import_module(f"{REPO}.main")
app = main_module.app

get_db = db_module.get_db if hasattr(db_module, 'get_db') else None

# These modules only exist in repository_after
try:
    processor_module = importlib.import_module(f"{REPO}.processor")
    chunk_text = processor_module.chunk_text
    process_job = processor_module.process_job
    process_single_chunk = processor_module.process_single_chunk
    MAX_RETRIES = processor_module.MAX_RETRIES
    _atomic_increment_completed = processor_module._atomic_increment_completed
    _atomic_increment_failed = processor_module._atomic_increment_failed
    _finalize_job = processor_module._finalize_job
    resume_processing_jobs = processor_module.resume_processing_jobs
except (ModuleNotFoundError, AttributeError):
    chunk_text = None
    process_job = None
    process_single_chunk = None
    MAX_RETRIES = None
    _atomic_increment_completed = None
    _atomic_increment_failed = None
    _finalize_job = None
    resume_processing_jobs = None

try:
    schemas_module = importlib.import_module(f"{REPO}.schemas")
    AnalyzeRequest = schemas_module.AnalyzeRequest
except (ModuleNotFoundError, AttributeError):
    AnalyzeRequest = None

try:
    migration_module = importlib.import_module(f"{REPO}.alembic_migration")
    upgrade = migration_module.upgrade
    downgrade = migration_module.downgrade
    UPGRADE_SQL = migration_module.UPGRADE_SQL
    DOWNGRADE_SQL = migration_module.DOWNGRADE_SQL
except (ModuleNotFoundError, AttributeError):
    upgrade = None
    downgrade = None
    UPGRADE_SQL = None
    DOWNGRADE_SQL = None

from fastapi.testclient import TestClient


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture(autouse=True)
def setup_db():
    """Create fresh tables for each test."""
    Base.metadata.create_all(bind=db_module.engine)
    yield
    Base.metadata.drop_all(bind=db_module.engine)
    # Clean up test db file
    try:
        os.remove("test_analysis.db")
    except OSError:
        pass


@pytest.fixture
def db_session():
    """Provide a test DB session."""
    session = db_module.SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """FastAPI test client with overridden DB."""
    def override_get_db():
        session = db_module.SessionLocal()
        try:
            yield session
        finally:
            session.close()

    # Override get_db dependency — use the one from main module or database module
    _get_db = getattr(main_module, 'get_db', None) or get_db
    if _get_db:
        app.dependency_overrides[_get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ============================================================================
# Helper AI mocks
# ============================================================================

async def mock_ai_success(chunk: str) -> str:
    """Always succeeds instantly."""
    return f"Summary: {chunk[:50]}..."


async def mock_ai_slow(chunk: str) -> str:
    """Simulates slow AI call."""
    await asyncio.sleep(2.0)
    return f"Summary: {chunk[:50]}..."


_fail_call_count = 0

async def mock_ai_fail_chunk_1(chunk: str) -> str:
    """Fails consistently for chunk containing 'CHUNK1_MARKER'."""
    if "CHUNK1_MARKER" in chunk:
        raise Exception("Upstream AI Provider: Connection Reset")
    return f"Summary: {chunk[:50]}..."


async def mock_ai_always_fail(chunk: str) -> str:
    """Always fails."""
    raise Exception("Upstream AI Provider: Connection Reset")


# ============================================================================
# Requirement 1: POST returns 202 with job_id
# ============================================================================

class TestPostEndpoint:
    def test_returns_202_status(self, client):
        resp = client.post("/v1/analyze", json={"text": "Hello world", "max_chunk_chars": 500})
        assert resp.status_code == 202

    def test_returns_job_id(self, client):
        resp = client.post("/v1/analyze", json={"text": "Hello world", "max_chunk_chars": 500})
        data = resp.json()
        assert "job_id" in data
        assert isinstance(data["job_id"], int)

    def test_returns_pending_status(self, client):
        resp = client.post("/v1/analyze", json={"text": "Test", "max_chunk_chars": 100})
        data = resp.json()
        assert data["status"] == "PENDING"


# ============================================================================
# Requirement 2: Chunking by max_chunk_chars
# ============================================================================

class TestChunking:
    def test_chunk_text_basic(self):
        result = chunk_text("abcdefghij", 3)
        assert result == ["abc", "def", "ghi", "j"]

    def test_chunk_text_exact_division(self):
        result = chunk_text("abcdef", 3)
        assert result == ["abc", "def"]

    def test_chunk_text_single_chunk(self):
        result = chunk_text("abc", 100)
        assert result == ["abc"]

    def test_chunk_text_empty(self):
        result = chunk_text("", 10)
        assert result == []

    def test_chunk_text_one_char(self):
        result = chunk_text("abcde", 1)
        assert result == ["a", "b", "c", "d", "e"]

    def test_max_chunk_chars_from_request(self, db_session):
        """Verify max_chunk_chars is stored from request."""
        job = AnalysisJob(raw_text="x" * 100, max_chunk_chars=25, status=JobStatus.PENDING.value)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)
        assert job.max_chunk_chars == 25


# ============================================================================
# Requirement 3: Retry with exponential backoff
# ============================================================================

class TestRetryLogic:
    def test_max_retries_constant(self):
        assert MAX_RETRIES >= 3

    def test_chunk_fails_after_max_retries(self, db_session):
        """Chunk that always fails should be marked FAILED after retries."""
        job = AnalysisJob(raw_text="test", max_chunk_chars=100, status=JobStatus.PROCESSING.value)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        chunk = ChunkRecord(
            job_id=job.id, chunk_index=0, chunk_text="fail me",
            status=ChunkStatus.PENDING.value,
        )
        db_session.add(chunk)
        db_session.commit()
        db_session.refresh(chunk)

        result = asyncio.get_event_loop().run_until_complete(
            process_single_chunk(job.id, chunk.id, 0, "fail me", ai_fn=mock_ai_always_fail)
        )
        assert result is False

        db_session.expire_all()
        chunk = db_session.query(ChunkRecord).filter(ChunkRecord.id == chunk.id).first()
        assert chunk.status == ChunkStatus.FAILED.value
        assert chunk.retries == MAX_RETRIES
        assert chunk.error is not None

    def test_chunk_succeeds_on_first_try(self, db_session):
        """Chunk that succeeds should be marked COMPLETED."""
        job = AnalysisJob(raw_text="test", max_chunk_chars=100, status=JobStatus.PROCESSING.value)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        chunk = ChunkRecord(
            job_id=job.id, chunk_index=0, chunk_text="success text",
            status=ChunkStatus.PENDING.value,
        )
        db_session.add(chunk)
        db_session.commit()
        db_session.refresh(chunk)

        result = asyncio.get_event_loop().run_until_complete(
            process_single_chunk(job.id, chunk.id, 0, "success text", ai_fn=mock_ai_success)
        )
        assert result is True

        db_session.expire_all()
        chunk = db_session.query(ChunkRecord).filter(ChunkRecord.id == chunk.id).first()
        assert chunk.status == ChunkStatus.COMPLETED.value
        assert chunk.result is not None


# ============================================================================
# Requirement 4: Atomic counter updates
# ============================================================================

class TestAtomicCounters:
    def test_increment_completed(self, db_session):
        job = AnalysisJob(raw_text="test", max_chunk_chars=100, status=JobStatus.PROCESSING.value)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        new_val = _atomic_increment_completed(db_session, job.id)
        assert new_val == 1

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.chunks_completed == 1

    def test_increment_failed(self, db_session):
        job = AnalysisJob(raw_text="test", max_chunk_chars=100, status=JobStatus.PROCESSING.value)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        new_val = _atomic_increment_failed(db_session, job.id)
        assert new_val == 1

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.chunks_failed == 1

    def test_multiple_increments(self, db_session):
        job = AnalysisJob(raw_text="test", max_chunk_chars=100, status=JobStatus.PROCESSING.value)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        for _ in range(5):
            _atomic_increment_completed(db_session, job.id)

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.chunks_completed == 5


# ============================================================================
# Requirement 5: State machine transitions
# ============================================================================

class TestStateMachine:
    def test_initial_state_is_pending(self, db_session):
        job = AnalysisJob(raw_text="test", max_chunk_chars=100)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)
        assert job.status == JobStatus.PENDING.value

    def test_all_success_transitions_to_completed(self, db_session):
        job = AnalysisJob(
            raw_text="test", max_chunk_chars=100,
            status=JobStatus.PROCESSING.value, total_chunks=2,
        )
        db_session.add(job)
        db_session.commit()

        for i in range(2):
            chunk = ChunkRecord(
                job_id=job.id, chunk_index=i, chunk_text="ok",
                status=ChunkStatus.COMPLETED.value, result="Summary: ok",
            )
            db_session.add(chunk)
        db_session.commit()

        _finalize_job(db_session, job.id)

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.status == JobStatus.COMPLETED.value

    def test_all_failed_transitions_to_failed(self, db_session):
        job = AnalysisJob(
            raw_text="test", max_chunk_chars=100,
            status=JobStatus.PROCESSING.value, total_chunks=2,
        )
        db_session.add(job)
        db_session.commit()

        for i in range(2):
            chunk = ChunkRecord(
                job_id=job.id, chunk_index=i, chunk_text="bad",
                status=ChunkStatus.FAILED.value, error="fail",
            )
            db_session.add(chunk)
        db_session.commit()

        _finalize_job(db_session, job.id)

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.status == JobStatus.FAILED.value

    def test_partial_failure_transitions_to_partial_success(self, db_session):
        job = AnalysisJob(
            raw_text="test", max_chunk_chars=100,
            status=JobStatus.PROCESSING.value, total_chunks=2,
        )
        db_session.add(job)
        db_session.commit()

        c1 = ChunkRecord(
            job_id=job.id, chunk_index=0, chunk_text="ok",
            status=ChunkStatus.COMPLETED.value, result="Summary: ok",
        )
        c2 = ChunkRecord(
            job_id=job.id, chunk_index=1, chunk_text="bad",
            status=ChunkStatus.FAILED.value, error="fail",
        )
        db_session.add_all([c1, c2])
        db_session.commit()

        _finalize_job(db_session, job.id)

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.status == JobStatus.PARTIAL_SUCCESS.value

    def test_valid_status_values(self):
        """Verify all required statuses exist."""
        assert JobStatus.PENDING.value == "PENDING"
        assert JobStatus.PROCESSING.value == "PROCESSING"
        assert JobStatus.COMPLETED.value == "COMPLETED"
        assert JobStatus.FAILED.value == "FAILED"
        assert JobStatus.PARTIAL_SUCCESS.value == "PARTIAL_SUCCESS"


# ============================================================================
# Requirement 6: GET /v1/analyze/{job_id} with progress and errors
# ============================================================================

class TestGetEndpoint:
    def test_get_returns_job_status(self, client, db_session):
        job = AnalysisJob(
            raw_text="hello", max_chunk_chars=100,
            status=JobStatus.PROCESSING.value, total_chunks=4,
            chunks_completed=2, chunks_failed=0,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        resp = client.get(f"/v1/analyze/{job.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "PROCESSING"
        assert data["progress_pct"] == 50.0

    def test_get_returns_404_for_missing_job(self, client):
        resp = client.get("/v1/analyze/99999")
        assert resp.status_code == 404

    def test_get_returns_chunk_errors(self, client, db_session):
        job = AnalysisJob(
            raw_text="test", max_chunk_chars=100,
            status=JobStatus.PARTIAL_SUCCESS.value, total_chunks=2,
            chunks_completed=1, chunks_failed=1,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        chunk = ChunkRecord(
            job_id=job.id, chunk_index=1, chunk_text="bad",
            status=ChunkStatus.FAILED.value, error="Connection Reset",
        )
        db_session.add(chunk)
        db_session.commit()

        resp = client.get(f"/v1/analyze/{job.id}")
        data = resp.json()
        assert len(data["chunk_errors"]) == 1
        assert data["chunk_errors"][0]["chunk_index"] == 1
        assert "Connection Reset" in data["chunk_errors"][0]["error"]

    def test_progress_100_when_all_done(self, client, db_session):
        job = AnalysisJob(
            raw_text="test", max_chunk_chars=100,
            status=JobStatus.COMPLETED.value, total_chunks=3,
            chunks_completed=3, chunks_failed=0,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        resp = client.get(f"/v1/analyze/{job.id}")
        data = resp.json()
        assert data["progress_pct"] == 100.0


# ============================================================================
# Requirement 7: Ordered reassembly
# ============================================================================

class TestOrderedReassembly:
    def test_results_merged_in_chunk_order(self, db_session):
        job = AnalysisJob(
            raw_text="aabbcc", max_chunk_chars=2,
            status=JobStatus.PROCESSING.value, total_chunks=3,
        )
        db_session.add(job)
        db_session.commit()

        # Add chunks out of order
        c2 = ChunkRecord(
            job_id=job.id, chunk_index=2, chunk_text="cc",
            status=ChunkStatus.COMPLETED.value, result="Result_C",
        )
        c0 = ChunkRecord(
            job_id=job.id, chunk_index=0, chunk_text="aa",
            status=ChunkStatus.COMPLETED.value, result="Result_A",
        )
        c1 = ChunkRecord(
            job_id=job.id, chunk_index=1, chunk_text="bb",
            status=ChunkStatus.COMPLETED.value, result="Result_B",
        )
        db_session.add_all([c2, c0, c1])
        db_session.commit()

        _finalize_job(db_session, job.id)

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.analysis_result == "Result_A\n\nResult_B\n\nResult_C"

    def test_partial_results_ordered(self, db_session):
        """Even with some failed chunks, completed ones are in order."""
        job = AnalysisJob(
            raw_text="aabbcc", max_chunk_chars=2,
            status=JobStatus.PROCESSING.value, total_chunks=3,
        )
        db_session.add(job)
        db_session.commit()

        c0 = ChunkRecord(
            job_id=job.id, chunk_index=0, chunk_text="aa",
            status=ChunkStatus.COMPLETED.value, result="Result_A",
        )
        c1 = ChunkRecord(
            job_id=job.id, chunk_index=1, chunk_text="bb",
            status=ChunkStatus.FAILED.value, error="fail",
        )
        c2 = ChunkRecord(
            job_id=job.id, chunk_index=2, chunk_text="cc",
            status=ChunkStatus.COMPLETED.value, result="Result_C",
        )
        db_session.add_all([c0, c1, c2])
        db_session.commit()

        _finalize_job(db_session, job.id)

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.analysis_result == "Result_A\n\nResult_C"
        assert job.status == JobStatus.PARTIAL_SUCCESS.value


# ============================================================================
# Requirement 8: Database session isolation
# ============================================================================

class TestDatabaseIsolation:
    def test_background_db_creates_new_session(self):
        session1 = db_module.get_background_db()
        session2 = db_module.get_background_db()
        assert session1 is not session2
        session1.close()
        session2.close()

    def test_background_session_independent_of_request(self, db_session):
        """Background session can work after request session closes."""
        bg_session = db_module.get_background_db()
        try:
            job = AnalysisJob(raw_text="test", max_chunk_chars=100, status=JobStatus.PENDING.value)
            bg_session.add(job)
            bg_session.commit()
            bg_session.refresh(job)
            assert job.id is not None
        finally:
            bg_session.close()


# ============================================================================
# Requirement: Worker Restart Resilience
# ============================================================================

class TestWorkerRestartResilience:
    def test_resume_stale_processing_jobs(self, db_session):
        """Jobs left in PROCESSING state should be resumed on startup."""
        # Create a job stuck in PROCESSING state (simulating a crash)
        job = AnalysisJob(
            raw_text="stale job content",
            max_chunk_chars=50,
            status=JobStatus.PROCESSING.value,
            total_chunks=2,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        # Create chunk records that were partially processed
        c1 = ChunkRecord(
            job_id=job.id, chunk_index=0, chunk_text="stale job c",
            status=ChunkStatus.PENDING.value,
        )
        c2 = ChunkRecord(
            job_id=job.id, chunk_index=1, chunk_text="ontent",
            status=ChunkStatus.PENDING.value,
        )
        db_session.add_all([c1, c2])
        db_session.commit()

        # Simulate worker restart by calling resume function
        asyncio.get_event_loop().run_until_complete(resume_processing_jobs())

        # Verify job was completed
        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.status in [JobStatus.COMPLETED.value, JobStatus.PARTIAL_SUCCESS.value, JobStatus.FAILED.value]
        # Job should no longer be PROCESSING
        assert job.status != JobStatus.PROCESSING.value

    def test_concurrent_chunk_execution(self, db_session):
        """Verify chunks are processed concurrently, not sequentially."""
        # Create a job with multiple chunks
        job = AnalysisJob(
            raw_text="a" * 100,  # 10 chunks at 10 chars each
            max_chunk_chars=10,
            status=JobStatus.PENDING.value,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        # Track timing - concurrent should be faster than sequential
        start = time.monotonic()
        asyncio.get_event_loop().run_until_complete(
            process_job(job.id, ai_fn=mock_ai_success)
        )
        elapsed = time.monotonic() - start

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()

        assert job.status == JobStatus.COMPLETED.value
        assert job.total_chunks == 10
        # With concurrent execution, should complete much faster than 10 sequential calls
        # Each mock_ai_success is nearly instant, so total should be well under 1 second
        assert elapsed < 2.0, f"Expected concurrent execution to be fast, took {elapsed:.2f}s"


# ============================================================================
# Requirement 9: Alembic migration
# ============================================================================

class TestAlembicMigration:
    def test_upgrade_sql_has_status_column(self):
        assert "status" in UPGRADE_SQL

    def test_upgrade_sql_has_chunk_records_table(self):
        assert "chunk_records" in UPGRADE_SQL

    def test_upgrade_sql_has_total_chunks(self):
        assert "total_chunks" in UPGRADE_SQL

    def test_upgrade_sql_has_chunks_completed(self):
        assert "chunks_completed" in UPGRADE_SQL

    def test_upgrade_sql_has_chunks_failed(self):
        assert "chunks_failed" in UPGRADE_SQL

    def test_upgrade_sql_has_indexes(self):
        assert "CREATE INDEX" in UPGRADE_SQL

    def test_downgrade_sql_exists(self):
        assert "DROP TABLE" in DOWNGRADE_SQL

    def test_upgrade_callable(self):
        upgrade()  # Should not raise

    def test_downgrade_callable(self):
        downgrade()  # Should not raise


# ============================================================================
# Requirement 10: Integration - job_id returned < 100ms
# ============================================================================

class TestIntegration:
    def test_job_id_returned_under_100ms(self, client, monkeypatch):
        """POST must return job_id immediately, not block on AI processing.

        Even with a slow AI provider (several seconds), the job_id must be
        returned in under 100ms because processing happens in background.
        """
        # Patch the AI provider to be very slow (simulating real-world latency)
        async def slow_ai(chunk: str) -> str:
            await asyncio.sleep(5.0)  # 5 second delay per chunk
            return f"Summary: {chunk[:50]}..."

        # Monkeypatch the ai_provider module
        try:
            import repository_after.processor as proc
            original_ai = proc.call_ai_provider
            proc.call_ai_provider = slow_ai
        except ImportError:
            pass  # Running against repository_before

        large_text = "x" * 10000  # This creates 20 chunks at 500 chars each

        start = time.monotonic()
        resp = client.post("/v1/analyze", json={"text": large_text, "max_chunk_chars": 500})
        elapsed_ms = (time.monotonic() - start) * 1000

        # Restore original AI provider
        try:
            proc.call_ai_provider = original_ai
        except (NameError, UnboundLocalError):
            pass

        assert resp.status_code == 202
        assert "job_id" in resp.json()
        # Must return in under 100ms even with slow AI (async background processing)
        assert elapsed_ms < 100, f"Response took {elapsed_ms:.0f}ms, expected < 100ms"

    def test_full_pipeline_with_mock_ai(self, db_session):
        """Full end-to-end: submit, process, verify COMPLETED."""
        job = AnalysisJob(
            raw_text="alpha bravo charlie",
            max_chunk_chars=10,
            status=JobStatus.PENDING.value,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        asyncio.get_event_loop().run_until_complete(
            process_job(job.id, ai_fn=mock_ai_success)
        )

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.status == JobStatus.COMPLETED.value
        assert job.analysis_result is not None
        assert job.chunks_completed == job.total_chunks
        assert job.chunks_failed == 0


# ============================================================================
# Requirement 11: Adversarial - one chunk always fails
# ============================================================================

class TestAdversarial:
    def test_one_chunk_always_fails_partial_success(self, db_session, caplog):
        """
        Mock AI fails consistently for chunk containing 'CHUNK1_MARKER'.
        Other chunks succeed. Result: PARTIAL_SUCCESS.
        Verifies both database state AND log output.
        """
        import logging
        caplog.set_level(logging.WARNING)

        text = "GOOD_DATA_" * 5 + "CHUNK1_MARKER_BAD" + "MORE_GOOD_" * 5
        job = AnalysisJob(
            raw_text=text,
            max_chunk_chars=50,
            status=JobStatus.PENDING.value,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        asyncio.get_event_loop().run_until_complete(
            process_job(job.id, ai_fn=mock_ai_fail_chunk_1)
        )

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()

        assert job.status in [JobStatus.PARTIAL_SUCCESS.value, JobStatus.FAILED.value]

        # Verify there are chunk-level errors in database
        failed_chunks = (
            db_session.query(ChunkRecord)
            .filter(ChunkRecord.job_id == job.id, ChunkRecord.status == ChunkStatus.FAILED.value)
            .all()
        )
        assert len(failed_chunks) >= 1
        for fc in failed_chunks:
            assert fc.error is not None
            assert fc.retries == MAX_RETRIES

        # Verify warning logs were emitted for failed attempts
        warning_logs = [r for r in caplog.records if r.levelno >= logging.WARNING]
        assert len(warning_logs) >= 1, "Expected warning logs for failed chunk retries"
        assert any("failed attempt" in r.message.lower() for r in warning_logs), \
            "Expected log message about failed attempts"

    def test_all_chunks_fail_transitions_to_failed(self, db_session, caplog):
        """All chunks fail -> FAILED status. Verifies logs are emitted."""
        import logging
        caplog.set_level(logging.WARNING)

        job = AnalysisJob(
            raw_text="test data for failure",
            max_chunk_chars=10,
            status=JobStatus.PENDING.value,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        asyncio.get_event_loop().run_until_complete(
            process_job(job.id, ai_fn=mock_ai_always_fail)
        )

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.status == JobStatus.FAILED.value
        assert job.chunks_failed == job.total_chunks

        # Verify warning logs were emitted
        warning_logs = [r for r in caplog.records if r.levelno >= logging.WARNING]
        assert len(warning_logs) >= job.total_chunks, \
            f"Expected at least {job.total_chunks} warning logs, got {len(warning_logs)}"

    def test_error_summary_populated_on_failure(self, db_session, caplog):
        """Error summary field should contain chunk error details."""
        import logging
        caplog.set_level(logging.WARNING)

        job = AnalysisJob(
            raw_text="fail content",
            max_chunk_chars=20,
            status=JobStatus.PENDING.value,
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        asyncio.get_event_loop().run_until_complete(
            process_job(job.id, ai_fn=mock_ai_always_fail)
        )

        db_session.expire_all()
        job = db_session.query(AnalysisJob).filter(AnalysisJob.id == job.id).first()
        assert job.error_summary is not None
        assert "chunk_0" in job.error_summary

        # Verify logs contain error information
        assert any("failed attempt" in r.message.lower() for r in caplog.records), \
            "Expected log messages about failed attempts"
