"""
Background orchestration logic for chunked document analysis.

Handles:
- Document chunking by max_chunk_chars
- Per-chunk retry with exponential backoff
- Atomic database counter updates with row-level locking
- Ordered result reassembly
- State machine transitions
"""

import asyncio
import logging
from typing import Callable, Awaitable, Optional

from sqlalchemy import update, select
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
    Uses its own isolated DB session.
    """
    if ai_fn is None:
        ai_fn = call_ai_provider

    for attempt in range(1, MAX_RETRIES + 1):
        db = get_background_db()
        try:
            # Mark chunk as processing
            db.execute(
                update(ChunkRecord)
                .where(ChunkRecord.id == chunk_id)
                .values(status=ChunkStatus.PROCESSING.value, retries=attempt)
            )
            db.commit()

            # Call AI provider
            result = await ai_fn(chunk_text_content)

            # Mark chunk as completed
            db.execute(
                update(ChunkRecord)
                .where(ChunkRecord.id == chunk_id)
                .values(status=ChunkStatus.COMPLETED.value, result=result)
            )
            db.commit()
            return True

        except Exception as e:
            db.rollback()
            logger.warning(
                f"Chunk {chunk_index} of job {job_id} failed attempt {attempt}/{MAX_RETRIES}: {e}"
            )

            if attempt < MAX_RETRIES:
                backoff = BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
                await asyncio.sleep(backoff)
            else:
                # All retries exhausted — mark as failed
                try:
                    db.execute(
                        update(ChunkRecord)
                        .where(ChunkRecord.id == chunk_id)
                        .values(
                            status=ChunkStatus.FAILED.value,
                            error=str(e),
                            retries=attempt,
                        )
                    )
                    db.commit()
                except Exception:
                    db.rollback()
                return False
        finally:
            db.close()

    return False


def _atomic_increment_completed(db: Session, job_id: int) -> int:
    """Atomically increment chunks_completed using row-level locking and return new value."""
    # Use SELECT ... FOR UPDATE equivalent via with_for_update()
    stmt = (
        select(AnalysisJob)
        .where(AnalysisJob.id == job_id)
        .with_for_update()
    )
    job = db.execute(stmt).scalar_one()
    job.chunks_completed += 1
    new_val = job.chunks_completed
    db.commit()
    return new_val


def _atomic_increment_failed(db: Session, job_id: int) -> int:
    """Atomically increment chunks_failed using row-level locking and return new value."""
    stmt = (
        select(AnalysisJob)
        .where(AnalysisJob.id == job_id)
        .with_for_update()
    )
    job = db.execute(stmt).scalar_one()
    job.chunks_failed += 1
    new_val = job.chunks_failed
    db.commit()
    return new_val


def _finalize_job(db: Session, job_id: int) -> None:
    """
    Finalize the job after all chunks are processed.
    Determines final status and assembles results in order.
    """
    stmt = (
        select(AnalysisJob)
        .where(AnalysisJob.id == job_id)
        .with_for_update()
    )
    job = db.execute(stmt).scalar_one()

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


async def process_job(
    job_id: int,
    ai_fn: Optional[Callable[[str], Awaitable[str]]] = None,
) -> None:
    """
    Orchestrate the full processing of a job.
    Creates chunks, processes them independently, and finalizes.
    """
    db = get_background_db()
    try:
        # Transition to PROCESSING
        job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        job.status = JobStatus.PROCESSING.value

        # Chunk the text
        chunks = chunk_text(job.raw_text, job.max_chunk_chars)
        job.total_chunks = len(chunks)

        # Create chunk records
        chunk_records = []
        for idx, text in enumerate(chunks):
            record = ChunkRecord(
                job_id=job_id,
                chunk_index=idx,
                chunk_text=text,
                status=ChunkStatus.PENDING.value,
            )
            db.add(record)
            chunk_records.append(record)

        db.commit()

        # Refresh to get IDs
        for r in chunk_records:
            db.refresh(r)

        chunk_ids = [(r.id, r.chunk_index, r.chunk_text) for r in chunk_records]
    finally:
        db.close()

    # Process each chunk independently
    for chunk_id, chunk_index, chunk_text_content in chunk_ids:
        success = await process_single_chunk(
            job_id, chunk_id, chunk_index, chunk_text_content, ai_fn
        )

        # Atomically update counters
        counter_db = get_background_db()
        try:
            if success:
                _atomic_increment_completed(counter_db, job_id)
            else:
                _atomic_increment_failed(counter_db, job_id)
        finally:
            counter_db.close()

    # Finalize
    final_db = get_background_db()
    try:
        _finalize_job(final_db, job_id)
    finally:
        final_db.close()
