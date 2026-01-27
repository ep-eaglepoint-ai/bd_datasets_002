# QG7ISG - Node.js Express Async Document Processing Pipeline with Real-Time Progress

**Category:** sft

## Overview
- Task ID: QG7ISG
- Title: Node.js Express Async Document Processing Pipeline with Real-Time Progress
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: qg7isg-node-js-express-async-document-processing-pipeline-with-real-time-progress

## Requirements
- Create a Node.js 20+ TypeScript project using Express.js, Prisma ORM (PostgreSQL), BullMQ (Redis), and ws library for WebSocket. Define data models: Partner (id, name, api_key, webhook_url), Schema (id, partner_id, name, version, fields JSON, validation_rules JSON), Job (id, partner_id, schema_id, filename, file_size, file_type, status enum, progress, records_total, records_processed, records_failed, error_message, timestamps), ProcessingError (id, job_id, record_index, field_name, error_code, error_message, raw_value).
- Implement POST /api/upload endpoint with X-API-Key authentication. Stream uploaded file to disk without loading into memory. Validate file type (CSV, JSON, XML). Create Job record and add to BullMQ queue. Return job_id within 500ms regardless of file size.
- Implement job listing and detail endpoints: GET /api/jobs (paginated, filterable by status), GET /api/jobs/:jobId (full details), GET /api/jobs/:jobId/errors (paginated errors). Verify job belongs to authenticated partner.
- Implement job control endpoints: POST /api/jobs/:jobId/cancel (only PENDING/PROCESSING jobs), POST /api/jobs/:jobId/retry (only FAILED jobs - reset counters, delete errors, re-queue).
- Implement WebSocket server at /ws/jobs/:jobId requiring partnerId query param. Track connections per job using Map. Broadcast messages with types: progress, error, completed. Throttle progress broadcasts to every 2 seconds.
- Implement BullMQ worker processing jobs from queue. Update job status to PROCESSING on start. Support configurable concurrency.
- Implement streaming file parsers for CSV (csv-parse), JSON (incremental parsing), and XML (fast-xml-parser). Process records one at a time without loading full file into memory.
- Implement dynamic record validation using Joi or Zod. Build schema from partner's Schema.fields and validation_rules. Support types: string, number, boolean, date, email, url with constraints (min, max, pattern, enum, required).
- Implement record transformation applying field mappings, type conversions, and default values based on Schema.fields configuration.
- Implement batch database insert (100 records per batch). Log each validation error to ProcessingError table with record details. Continue processing remaining records without stopping on errors.
- Update job progress in database every 2 seconds (not per record). Broadcast progress via WebSocket. Check for cancellation periodically and stop processing within 5 seconds if cancelled.
- Implement graceful shutdown handling SIGTERM/SIGINT. Close WebSocket connections, complete current batch, disconnect database. Clean up uploaded file after processing completes.
- Implement GET /api/health endpoint checking database and Redis connectivity. Return 503 if any service unhealthy.
- Implement API key authentication middleware validating X-API-Key header against Partner.api_key. Attach partner to request context.
- Create Docker Compose with services: app (Express API), worker (BullMQ processor), postgres (15+), redis (7+). Include health checks and volume persistence. Ensure 100 concurrent WebSocket connections do not degrade API response times.

## Metadata
- Programming Languages: Nodejs
- Frameworks: Express.js
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
