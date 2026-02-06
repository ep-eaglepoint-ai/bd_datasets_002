# models.py
from sqlalchemy import Column, Integer, String, Text
from .database import Base

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    id = Column(Integer, primary_key=True, index=True)
    raw_text = Column(Text)
    analysis_result = Column(Text, nullable=True)
    # TODO: Expand schema to support chunk-based state tracking and error handling