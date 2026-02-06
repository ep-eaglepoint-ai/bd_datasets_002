"""
Pydantic schemas for request/response models.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class AnalyzeRequest(BaseModel):
    text: str
    max_chunk_chars: int = Field(default=1000, gt=0)


class AnalyzeResponse(BaseModel):
    job_id: int
    status: str


class ChunkError(BaseModel):
    chunk_index: int
    error: str


class JobStatusResponse(BaseModel):
    job_id: int
    status: str
    total_chunks: int
    chunks_completed: int
    chunks_failed: int
    progress_pct: float
    analysis_result: Optional[str] = None
    chunk_errors: List[ChunkError] = []
