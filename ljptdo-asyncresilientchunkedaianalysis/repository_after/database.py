"""
Database configuration for async-resilient chunked AI analysis service.
Uses SQLite with proper thread isolation for background tasks.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

SQLALCHEMY_DATABASE_URL = "sqlite:///./document_analysis.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Yield a database session for request-response cycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_background_db():
    """Create an isolated database session for background tasks.
    Caller is responsible for closing."""
    return SessionLocal()
