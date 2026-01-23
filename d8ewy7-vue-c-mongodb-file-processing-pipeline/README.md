# D8EWY7 - Vue + C + MongoDB File Processing Pipeline

**Category:** sft

## Overview
- Task ID: D8EWY7
- Title: Vue + C + MongoDB File Processing Pipeline
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: d8ewy7-vue-c-mongodb-file-processing-pipeline

## Requirements
- The Vue 3 frontend must provide a drag-and-drop file upload interface with visual feedback. When a user drags a CSV file over the drop zone, the zone must highlight. When dropped, the file must begin uploading immediately with a progress bar showing percentage complete and estimated time remaining based on current upload speed.
- The C backend must implement an HTTP server using libmicrohttpd that accepts multipart/form-data POST requests on the /api/upload endpoint. The server must stream the uploaded file to disk in chunks rather than buffering the entire file in memory, ensuring memory usage stays under 256MB for files up to 100MB.
- CSV parsing must be implemented in C from scratch without external libraries. The parser must correctly handle RFC 4180 edge cases: fields containing commas must be quoted, fields containing quotes must escape them by doubling, fields containing newlines must be quoted, and the parser must not break on any of these cases.
- Each uploaded file must be assigned a unique batch ID (UUID format) that is returned to the frontend immediately after upload begins. This batch ID must be used to track all records from that upload and allow users to query or delete an entire batch.
- Record validation must check each row against the shipment schema: tracking_number (required, alphanumeric, 10-30 chars), origin (required, string), destination (required, string), weight_kg (required, positive number), length_cm/width_cm/height_cm (optional, positive numbers), ship_date (required, ISO 8601 format), status (required, one of: pending, in_transit, delivered, returned, lost).
- Valid records must be inserted into MongoDB using the libmongoc driver with bulk insert operations. Inserts must be batched in groups of 500 documents to balance memory usage and insertion speed. Each document must include the batch_id, row_number, parsed fields, and inserted_at timestamp.
- Invalid records must not be inserted into MongoDB. Instead, validation errors must be collected with row number, field name, expected format, and actual value. These errors must be stored in a separate MongoDB collection linked by batch_id for later retrieval.
- The frontend must poll the /api/status/{batch_id} endpoint every 500ms during processing to receive progress updates. The response must include: total_rows, processed_rows, valid_rows, invalid_rows, and current_status (uploading, parsing, validating, inserting, complete, failed).
- After processing completes, the frontend must display a summary showing total records, valid records inserted, and invalid records with errors. Users must be able to expand each error to see the problematic row data and specific validation failure reason.
- The frontend must provide a data table view of processed records with pagination (50 rows per page), sortable columns, and a search box that filters across all text fields. Filtering must happen server-side via MongoDB queries, not client-side.
- Users must be able to export filtered results as JSON or CSV. The export must include only the currently filtered/searched records, not the entire dataset. Export must stream the response to handle large result sets without memory issues.
- The C backend must handle concurrent uploads by using separate threads or processes for each upload. Uploads must not block each other, and MongoDB connections must be properly pooled or created per-thread to avoid connection conflicts.
- Error handling must be comprehensive: malformed CSV files must return HTTP 400 with descriptive error, MongoDB connection failures must trigger retry with exponential backoff (1s, 2s, 4s, max 30s), and any unhandled exception must return HTTP 500 with a generic error message (no stack traces exposed).
- The system must include a Docker Compose configuration with three services: vue-frontend (Node 20 for build, nginx for serve), c-backend (built from source with all dependencies), and mongodb (official image with persistent volume). A single docker-compose up must start the entire system.
- The C backend must include a health check endpoint at /api/health that returns HTTP 200 with {"status": "healthy", "mongodb": "connected"} when operational, or appropriate error status when MongoDB is unreachable.

## Metadata
- Programming Languages: Javascript, C
- Frameworks: vue
- Libraries: (none)
- Databases: mongodb
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
