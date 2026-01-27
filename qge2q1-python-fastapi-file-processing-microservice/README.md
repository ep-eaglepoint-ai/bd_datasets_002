# QGE2Q1 - Python FastAPI File Processing Microservice

**Category:** sft

## Overview
- Task ID: QGE2Q1
- Title: Python FastAPI File Processing Microservice
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: qge2q1-python-fastapi-file-processing-microservice

## Requirements
- Create a FastAPI application with proper lifespan management. Initialize database connections on startup using async context manager. Close all connections gracefully on shutdown. Use SQLAlchemy async engine with connection pooling (pool_size=20, max_overflow=40).
- Define a Job model with fields: id (UUID primary key, auto-generated), filename (string max 255, required), file_size (bigint, required), file_type (string max 50, required - values: csv, xlsx, xls), status (enum: QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED), progress (integer 0-100, default 0), rows_processed (integer, default 0), rows_failed (integer, default 0), error_message (text, nullable), webhook_url (string max 500, nullable), created_at (timestamp, auto-set, indexed), started_at (timestamp, nullable), completed_at (timestamp, nullable).
- Define a ProcessingError model with fields: id (UUID primary key), job_id (UUID foreign key to Job with cascade delete), row_number (integer, required), column_name (string max 255, nullable), error_type (string max 100, required), error_message (text, required), raw_value (text, nullable), created_at (timestamp, auto-set).
- Implement POST /api/files/upload endpoint accepting multipart file upload and optional webhook_url form field. Stream file to disk in 8KB chunks without loading entire file into memory. Validate file extension (csv, xlsx, xls only). Return 400 for unsupported types. Return 413 if file exceeds 500MB. Create Job record and return job_id within 500ms regardless of file size.
- Implement GET /api/jobs endpoint with pagination (page, page_size query params with defaults 1 and 50). Support filtering by status (exact match enum) and date range (from_date, to_date on created_at). Return total count, current page, page_size, total_pages, and jobs array. Order by created_at descending.
- Implement GET /api/jobs/{job_id} endpoint returning full job details. Return 404 if job not found. Response time must be under 100ms.
- Implement GET /api/jobs/{job_id}/errors endpoint with pagination. Return processing errors for the job ordered by row_number. Return 404 if job not found.
- Implement DELETE /api/jobs/{job_id} endpoint. If job is PROCESSING, mark as CANCELLED (worker should check this flag). Otherwise, delete the job record (cascade deletes errors) and remove the uploaded file from disk. Return 204 on success.
- Implement POST /api/jobs/{job_id}/retry endpoint. Only allow retry for FAILED or CANCELLED jobs. Reset progress, rows_processed, rows_failed to 0. Clear error_message. Delete existing ProcessingError records. Set status to QUEUED. Re-queue the background task. Return 400 if job is not retryable.
- Implement GET /api/health endpoint returning status of database and Redis connections. Return 200 with healthy status if all services responding, 503 if any service unhealthy.
- Use Celery with Redis as broker and backend for background task processing. Configure worker with concurrency=4, max_tasks_per_child=10, task_acks_late=True, worker_prefetch_multiplier=1.
- Implement file processing task that reads CSV files using chunked iteration (not loading entire file). For Excel files, use openpyxl in read_only mode to minimize memory usage. Process in chunks of 10,000 rows.
- During processing, update job progress in database every 5 seconds (not on every row). Calculate progress as percentage of rows processed vs total rows. Check for CANCELLED status before processing each chunk and stop if cancelled.
- For each row, validate data (check for nulls, data types, constraints). Log validation errors to ProcessingError table with row_number, column_name, error_type, error_message, and raw_value. Continue processing remaining rows even if some fail.
- After processing completes (success or failure), send webhook POST request to webhook_url if configured. Payload must include: job_id, status, rows_processed, rows_failed, completed_at (ISO format). Retry webhook up to 3 times with exponential backoff. Webhook must be delivered within 10 seconds of job completion.
- Handle graceful shutdown: Celery worker should complete current task or mark job for retry before stopping. Configure worker_shutdown_timeout and soft_time_limit appropriately.
- Create Docker Compose configuration with services: api (FastAPI with uvicorn, 4 workers), worker (Celery), db (PostgreSQL 15+), redis (Redis 7+). Use named volumes for data persistence. Include health checks for all services.
- Create Pydantic schemas for all request/response models with proper validation. Use from_attributes=True for ORM model conversion. Define separate schemas for create, update, and response operations.
- Implement proper error handling: return appropriate HTTP status codes (400 for validation errors, 404 for not found, 413 for file too large, 500 for server errors). Include error details in response body.
- Create requirements.txt with pinned versions: fastapi>=0.104.0, uvicorn[standard]>=0.24.0, sqlalchemy[asyncio]>=2.0.23, asyncpg>=0.29.0, pydantic>=2.5.0, pydantic-settings>=2.1.0, celery[redis]>=5.3.4, redis>=5.0.1, aiofiles>=23.2.1, pandas>=2.1.3, openpyxl>=3.1.2, httpx>=0.25.2, python-multipart>=0.0.6.
- Ensure 50 concurrent uploads do not degrade status endpoint response times. Use database connection pooling and avoid blocking operations in API endpoints. Status endpoint must return within 100ms under load.
- File storage: save uploaded files to configurable directory (UPLOAD_DIR env var). Use job_id as filename prefix to avoid collisions. Clean up files when job is deleted.

## Metadata
- Programming Languages: Python
- Frameworks: Fast API
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
