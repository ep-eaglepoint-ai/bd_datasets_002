# LJPTDO - asyncResilientChunkedAiAnalysis

**Category:** sft

## Overview
- Task ID: LJPTDO
- Title: asyncResilientChunkedAiAnalysis
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ljptdo-asyncresilientchunkedaianalysis

## Requirements
- Refactor POST /v1/analyze to return a 202 Accepted status with a unique job_id immediately upon receiving the payload.
- Implement a chunking strategy that decomposes the 'raw_text' into smaller segments based on a configurable 'max_chunk_chars' parameter provided in the request.
- Develop a background orchestration logic that processes chunks independently. The system must support a 'Max Retries' policy (at least 3 attempts) for each chunk using an exponential backoff strategy.
- The background processor must handle concurrency carefully; use row-level locking or atomic counters in the database to update 'chunks_completed' without race conditions.
- Define a clear state machine for the Job: PENDING, PROCESSING, COMPLETED, FAILED, and PARTIAL_SUCCESS (if some chunks fail after all retries).
- Implement GET /v1/analyze/{job_id} which returns the current status, a percentage based on chunk completion, and a list of any specific chunk-level errors encountered.
- Reassembly Logic: Once all chunks are processed, the system must merge the results into the 'analysis_result' field in the correct original order.
- Database Resilience: Ensure the database session used in background tasks is properly isolated from the request-response cycle and handles 'stale connection' or 'session closed' edge cases.
- Alembic: Provide the logical migration steps required to track the new chunk-level metadata and overall job lifecycle state
- Testing (Integration): Use FastAPI's TestClient to verify that the job_id is returned in under 100ms even when the simulated AI work takes several seconds.
- Testing (Negative/Adversarial): Write a unit test that mocks the AI provider to fail consistently for exactly one chunk and verify the system correctly transitions to a FAILED or PARTIAL_SUCCESS state with appropriate error logs.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
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
