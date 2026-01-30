"""
Background orchestration logic for chunked document analysis.

Handles:
- Document chunking by max_chunk_chars
- Per-chunk retry with exponential backoff
- Atomic database counter updates (SQL UPDATE for true atomicity)
- Ordered result reassembly
- State machine transitions
- Worker restart resilience
"""

import asyncio
import logging
from typing import Callable, Awaitable, Optional
from functools import partial

from sqlalchemy import update, select, text
from sqlalchemy.orm import Session

from .database import get_background_db
from .models import AnalysisJob, ChunkRecord, JobStatus, ChunkStatus
from .ai_provider import call_ai_provider

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
BASE_BACKOFF_SECONDS = 0.5


def chunk_text(text: str, max_chunk_chars: int) -> list[str]:
    """Split text into chunks of at most max_chunk_chars characters."""
    if max_chunk_chars <= 0:
        raise ValueError("max_chunk_chars must be positive")
    chunks = []
    for i in range(0, len(text), max_chunk_chars):
        chunks.append(text[i:i + max_chunk_chars])
    return chunks


def _sync_db_update(chunk_id: int, values: dict) -> None:
    """Sync DB update wrapper for use with asyncio.to_thread."""
    db = get_background_db()
    try:
        db.execute(
            update(ChunkRecord)
            .where(ChunkRecord.id == chunk_id)
            .values(**values)
        )
        db.commit()
    finally:
        db.close()


async def process_single_chunk(
    job_id: int,
    chunk_id: int,
    chunk_index: int,
    chunk_text_content: str,
    ai_fn: Optional[Callable[[str], Awaitable[str]]] = None,
) -> bool:
    """
    Process a single chunk with retry and exponential backoff.
    Returns True if successful, False if all retries exhausted.
    Uses isolated DB sessions and runs sync DB ops in thread pool.
    """
    if ai_fn is None:
        ai_fn = call_ai_provider

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # Mark chunk as processing (non-blocking)
            await asyncio.to_thread(
                _sync_db_update,
                chunk_id,
                {"status": ChunkStatus.PROCESSING.value, "retries": attempt}
            )

            # Call AI provider (async)
            result = await ai_fn(chunk_text_content)

            # Mark chunk as completed (non-blocking)
            await asyncio.to_thread(
                _sync_db_update,
                chunk_id,
                {"status": ChunkStatus.COMPLETED.value, "result": result}
            )
            return True

        except Exception as e:
            logger.warning(
                f"Chunk {chunk_index} of job {job_id} failed attempt {attempt}/{MAX_RETRIES}: {e}"
            )

            if attempt < MAX_RETRIES:
                backoff = BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
                await asyncio.sleep(backoff)
            else:
                # All retries exhausted — mark as failed (non-blocking)
                try:
                    await asyncio.to_thread(
                        _sync_db_update,
                        chunk_id,
                        {
                            "status": ChunkStatus.FAILED.value,
                            "error": str(e),
                            "retries": attempt,
                        }
                    )
                except Exception:
                    pass
                return False

    return False


def _atomic_increment_completed(db: Session, job_id: int) -> int:
    """Atomically increment chunks_completed using SQL UPDATE and return new value.

    Uses UPDATE ... SET col = col + 1 which is atomic in all databases including SQLite.
    """
    db.execute(
        update(AnalysisJob)
        .where(AnalysisJob.id == job_id)
        .values(chunks_completed=AnalysisJob.chunks_completed + 1)
    )
    db.commit()
    # Fetch the new value
    job = db.execute(
        select(AnalysisJob).where(AnalysisJob.id == job_id)
    ).scalar_one()
    return job.chunks_completed


def _atomic_increment_failed(db: Session, job_id: int) -> int:
    """Atomically increment chunks_failed using SQL UPDATE and return new value.

    Uses UPDATE ... SET col = col + 1 which is atomic in all databases including SQLite.
    """
    db.execute(
        update(AnalysisJob)
        .where(AnalysisJob.id == job_id)
        .values(chunks_failed=AnalysisJob.chunks_failed + 1)
    )
    db.commit()
    # Fetch the new value
    job = db.execute(
        select(AnalysisJob).where(AnalysisJob.id == job_id)
    ).scalar_one()
    return job.chunks_failed


def _finalize_job(db: Session, job_id: int) -> None:
    """
    Finalize the job after all chunks are processed.
    Determines final status and assembles results in order.
    """
    job = db.execute(
        select(AnalysisJob).where(AnalysisJob.id == job_id)
    ).scalar_one()

    # Fetch all chunks in order
    chunks = (
        db.query(ChunkRecord)
        .filter(ChunkRecord.job_id == job_id)
        .order_by(ChunkRecord.chunk_index)
        .all()
    )

    failed_chunks = [c for c in chunks if c.status == ChunkStatus.FAILED.value]
    completed_chunks = [c for c in chunks if c.status == ChunkStatus.COMPLETED.value]

    # Reassemble results in original order
    ordered_results = []
    for c in chunks:
        if c.status == ChunkStatus.COMPLETED.value and c.result:
            ordered_results.append(c.result)

    if ordered_results:
        job.analysis_result = "\n\n".join(ordered_results)

    # Collect error summary
    if failed_chunks:
        errors = []
        for c in failed_chunks:
            errors.append(f"chunk_{c.chunk_index}: {c.error}")
        job.error_summary = "; ".join(errors)

    # Determine final status
    if len(failed_chunks) == 0:
        job.status = JobStatus.COMPLETED.value
    elif len(completed_chunks) == 0:
        job.status = JobStatus.FAILED.value
    else:
        job.status = JobStatus.PARTIAL_SUCCESS.value

    db.commit()


async def _process_chunk_with_counter_update(
    job_id: int,
    chunk_id: int,
    chunk_index: int,
    chunk_text_content: str,
    ai_fn: Optional[Callable[[str], Awaitable[str]]] = None,
) -> bool:
    """Process a single chunk and atomically update job counters."""
    success = await process_single_chunk(
        job_id, chunk_id, chunk_index, chunk_text_content, ai_fn
    )

    # Atomically update counters (non-blocking via thread pool)
    def _update_counter():
        counter_db = get_background_db()
        try:
            if success:
                _atomic_increment_completed(counter_db, job_id)
            else:
                _atomic_increment_failed(counter_db, job_id)
        finally:
            counter_db.close()

    await asyncio.to_thread(_update_counter)
    return success


async def process_job(
    job_id: int,
    ai_fn: Optional[Callable[[str], Awaitable[str]]] = None,
) -> None:
    """
    Orchestrate the full processing of a job.
    Creates chunks, processes them CONCURRENTLY with asyncio.gather(), and finalizes.
    """
    def _setup_chunks():
        """Sync function to set up job and create chunk records."""
        db = get_background_db()
        try:
            # Transition to PROCESSING
            job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
            if not job:
                logger.error(f"Job {job_id} not found")
                return None

            # Only process if PENDING or resuming from PROCESSING
            if job.status not in [JobStatus.PENDING.value, JobStatus.PROCESSING.value]:
                logger.info(f"Job {job_id} already in terminal state: {job.status}")
                return None

            job.status = JobStatus.PROCESSING.value

            # Chunk the text (only if not already chunked)
            existing_chunks = db.query(ChunkRecord).filter(ChunkRecord.job_id == job_id).count()
            if existing_chunks == 0:
                chunks = chunk_text(job.raw_text, job.max_chunk_chars)
                job.total_chunks = len(chunks)

                # Create chunk records
                for idx, text_content in enumerate(chunks):
                    record = ChunkRecord(
                        job_id=job_id,
                        chunk_index=idx,
                        chunk_text=text_content,
                        status=ChunkStatus.PENDING.value,
                    )
                    db.add(record)

            db.commit()

            # Fetch chunks that still need processing (PENDING or PROCESSING)
            pending_chunks = (
                db.query(ChunkRecord)
                .filter(
                    ChunkRecord.job_id == job_id,
                    ChunkRecord.status.in_([ChunkStatus.PENDING.value, ChunkStatus.PROCESSING.value])
                )
                .all()
            )
            chunk_ids = [(r.id, r.chunk_index, r.chunk_text) for r in pending_chunks]
            return chunk_ids
        finally:
            db.close()

    # Setup chunks (non-blocking)
    chunk_ids = await asyncio.to_thread(_setup_chunks)
    if chunk_ids is None:
        return

    if chunk_ids:
        # Process all chunks CONCURRENTLY with asyncio.gather()
        tasks = [
            _process_chunk_with_counter_update(job_id, chunk_id, chunk_index, chunk_text_content, ai_fn)
            for chunk_id, chunk_index, chunk_text_content in chunk_ids
        ]
        await asyncio.gather(*tasks)

    # Finalize (non-blocking)
    def _finalize():
        final_db = get_background_db()
        try:
            _finalize_job(final_db, job_id)
        finally:
            final_db.close()

    await asyncio.to_thread(_finalize)


async def resume_processing_jobs() -> None:
    """
    Recovery function: Resume all jobs that were left in PROCESSING state.
    Called on worker startup to handle restart resilience.
    """
    def _get_stale_jobs():
        db = get_background_db()
        try:
            jobs = (
                db.query(AnalysisJob)
                .filter(AnalysisJob.status == JobStatus.PROCESSING.value)
                .all()
            )
            return [j.id for j in jobs]
        finally:
            db.close()

    job_ids = await asyncio.to_thread(_get_stale_jobs)

    if job_ids:
        logger.info(f"Resuming {len(job_ids)} stale PROCESSING jobs: {job_ids}")
        # Resume each job concurrently
        tasks = [process_job(job_id) for job_id in job_ids]
        await asyncio.gather(*tasks)
