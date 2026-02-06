"""
Alembic Migration Steps (Logical)

This file documents the logical migration from the original monolith schema
to the new chunk-based architecture. In a production environment, these would
be generated via `alembic revision --autogenerate`.

Migration: Add chunk-level tracking and job lifecycle state
Revision ID: 001_add_chunk_tracking
"""


UPGRADE_SQL = """
-- Step 1: Add lifecycle columns to analysis_jobs
ALTER TABLE analysis_jobs ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE analysis_jobs ADD COLUMN total_chunks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE analysis_jobs ADD COLUMN chunks_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE analysis_jobs ADD COLUMN chunks_failed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE analysis_jobs ADD COLUMN max_chunk_chars INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE analysis_jobs ADD COLUMN error_summary TEXT;

-- Step 2: Create chunk_records table for granular tracking
CREATE TABLE chunk_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    result TEXT,
    error TEXT,
    retries INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (job_id) REFERENCES analysis_jobs(id)
);

-- Step 3: Create indexes for efficient querying
CREATE INDEX ix_chunk_records_job_id ON chunk_records(job_id);
CREATE INDEX ix_chunk_records_status ON chunk_records(status);
CREATE INDEX ix_analysis_jobs_status ON analysis_jobs(status);
"""

DOWNGRADE_SQL = """
-- Reverse: drop chunk_records and remove new columns
DROP TABLE IF EXISTS chunk_records;

-- SQLite does not support DROP COLUMN; in production (PostgreSQL),
-- you would run:
-- ALTER TABLE analysis_jobs DROP COLUMN status;
-- ALTER TABLE analysis_jobs DROP COLUMN total_chunks;
-- ALTER TABLE analysis_jobs DROP COLUMN chunks_completed;
-- ALTER TABLE analysis_jobs DROP COLUMN chunks_failed;
-- ALTER TABLE analysis_jobs DROP COLUMN max_chunk_chars;
-- ALTER TABLE analysis_jobs DROP COLUMN error_summary;
"""


def upgrade():
    """Apply migration."""
    print("Migration: Adding chunk-level tracking to analysis_jobs")
    print("Migration: Creating chunk_records table")
    print(UPGRADE_SQL)


def downgrade():
    """Reverse migration."""
    print("Downgrade: Removing chunk tracking")
    print(DOWNGRADE_SQL)


if __name__ == "__main__":
    upgrade()
