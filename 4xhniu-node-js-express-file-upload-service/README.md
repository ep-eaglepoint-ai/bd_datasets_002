# 4XHNIU - Node.js Express File Upload Service

**Category:** sft

## Overview
- Task ID: 4XHNIU
- Title: Node.js Express File Upload Service
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 4xhniu-node-js-express-file-upload-service

## Requirements
- Stream file uploads instead of buffering in memory. The current code reads the entire file into memory before saving it to disk. This causes memory to balloon to 3-4x the file size. Switch to streaming so memory stays under 50MB even for large files.
- Calculate checksums while streaming, not after. The SHA-256 hash is currently computed after the whole file is loaded. Update the hash incrementally as chunks arrive so you don't need the full file in memory.
- Validate file type early using the first few bytes. Right now, MIME type checking happens after the full file is buffered. Check the file header within the first chunk and reject invalid types immediately to save bandwidth.
- Enforce file size limits during the stream. The size check currently happens after buffering the entire file. Abort the stream as soon as the limit is exceeded instead of waiting until the upload completes.
- Write files to disk in chunks, not all at once. The fs.writeFileSync call blocks the event loop for seconds on large files. Use async chunked writes to keep the server responsive.
- Limit concurrent uploads to prevent overload. The server currently accepts unlimited simultaneous uploads. Cap it at 10 concurrent uploads with a queue for additional requests, returning 503 when at capacity.
- Use a database connection pool instead of one connection per upload. Each upload opens a new SQLite connection, runs a query, and closes it. Create a shared pool to eliminate connection overhead and prevent "too many open files" errors.
- Save metadata to the database asynchronously. The synchronous database write adds 200-500ms to every response. Return success to the client once the file is stored, and write metadata in the background.
- Track upload progress in memory, not the database. The current code inserts a database row for every 1% progress update (100 writes per file). Keep progress in memory and only persist the final result.
- Clean up temporary files from failed uploads. Incomplete uploads leave orphaned temp files that pile up over time. Handle stream errors properly and delete temp files older than 1 hour.
- Spread files across subdirectories. All files currently go into a single uploads/ folder, which slows down as it grows. Use a date-based or hash-based folder structure to keep each directory small.
- Return proper HTTP status codes without leaking internal paths. All errors currently return 500 with stack traces showing server paths. Use 400 for bad requests, 413 for size limit exceeded, 415 for invalid file type, and 503 for server at capacity.

## Metadata
- Programming Languages: Go
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
