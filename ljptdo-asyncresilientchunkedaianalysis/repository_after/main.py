"""
FastAPI application for async resilient chunked AI document analysis.

POST /v1/analyze  -> Returns 202 Accepted with job_id immediately
GET  /v1/analyze/{job_id} -> Returns job status, progress, and errors

Features:
- Async background processing with concurrent chunk execution
- Worker restart resilience via startup recovery
- Non-blocking DB operations
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import models
from . import database as db_module
from .database import get_db
from .models import AnalysisJob, ChunkRecord, JobStatus, ChunkStatus
from .schemas import AnalyzeRequest, AnalyzeResponse, JobStatusResponse, ChunkError
from .processor import process_job, resume_processing_jobs

logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=db_module.engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    On startup: resume any jobs left in PROCESSING state (worker restart resilience).
    """
    logger.info("Starting Document Analysis Service...")
    # Resume stale PROCESSING jobs from previous run (worker restart resilience)
    asyncio.create_task(resume_processing_jobs())
    yield
    logger.info("Shutting down Document Analysis Service...")


app = FastAPI(title="Document Analysis Service", lifespan=lifespan)


@app.post("/v1/analyze", status_code=202, response_model=AnalyzeResponse)
async def analyze_document(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
):
    """
    Submit a document for analysis. Returns 202 Accepted immediately
    with a job_id for status polling.
    """
    job = AnalysisJob(
        raw_text=request.text,
        status=JobStatus.PENDING.value,
        max_chunk_chars=request.max_chunk_chars,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Fire background processing (non-blocking)
    asyncio.create_task(process_job(job.id))

    return AnalyzeResponse(job_id=job.id, status=job.status)


@app.get("/v1/analyze/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: int, db: Session = Depends(get_db)):
    """
    Poll job status. Returns progress percentage, chunk errors,
    and final result when complete.
    """
    job = db.query(AnalysisJob).filter(AnalysisJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Calculate progress
    total = job.total_chunks
    done = job.chunks_completed + job.chunks_failed
    progress_pct = (done / total * 100.0) if total > 0 else 0.0

    # Collect chunk-level errors
    chunk_errors = []
    failed_chunks = (
        db.query(ChunkRecord)
        .filter(ChunkRecord.job_id == job_id, ChunkRecord.status == ChunkStatus.FAILED.value)
        .order_by(ChunkRecord.chunk_index)
        .all()
    )
    for c in failed_chunks:
        chunk_errors.append(ChunkError(chunk_index=c.chunk_index, error=c.error or "Unknown error"))

    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        total_chunks=job.total_chunks,
        chunks_completed=job.chunks_completed,
        chunks_failed=job.chunks_failed,
        progress_pct=round(progress_pct, 2),
        analysis_result=job.analysis_result,
        chunk_errors=chunk_errors,
    )
