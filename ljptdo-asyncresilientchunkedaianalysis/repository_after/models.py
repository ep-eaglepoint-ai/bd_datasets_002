"""
SQLAlchemy models for document analysis with chunk-level tracking.

State Machine:
    PENDING -> PROCESSING -> COMPLETED | FAILED | PARTIAL_SUCCESS
"""

from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
import enum

from .database import Base


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIAL_SUCCESS = "PARTIAL_SUCCESS"


class ChunkStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(Integer, primary_key=True, index=True)
    raw_text = Column(Text, nullable=False)
    status = Column(String(20), default=JobStatus.PENDING.value, nullable=False)
    analysis_result = Column(Text, nullable=True)
    total_chunks = Column(Integer, default=0, nullable=False)
    chunks_completed = Column(Integer, default=0, nullable=False)
    chunks_failed = Column(Integer, default=0, nullable=False)
    max_chunk_chars = Column(Integer, default=1000, nullable=False)
    error_summary = Column(Text, nullable=True)

    chunks = relationship("ChunkRecord", back_populates="job", order_by="ChunkRecord.chunk_index")


class ChunkRecord(Base):
    __tablename__ = "chunk_records"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("analysis_jobs.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    status = Column(String(20), default=ChunkStatus.PENDING.value, nullable=False)
    result = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    retries = Column(Integer, default=0, nullable=False)

    job = relationship("AnalysisJob", back_populates="chunks")
