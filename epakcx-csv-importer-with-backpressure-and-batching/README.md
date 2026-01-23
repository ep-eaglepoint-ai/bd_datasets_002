# EPAKCX -  CSV Importer with Backpressure and Batching

**Category:** sft

## Overview
- Task ID: EPAKCX
- Title:  CSV Importer with Backpressure and Batching
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: epakcx-csv-importer-with-backpressure-and-batching

## Requirements
- The backend must be implemented using Node.js with the Express framework and pg library for PostgreSQL.
- The code must implement a Batching Mechanism that accumulates records (e.g., 1000 rows) before executing a database query, rather than inserting row-by-row
- The solution must demonstrate Backpressure Management: it must pause the reading stream or wait for the drain event/promise resolution before processing the next chunk of data to prevent memory overflows.
- The system must handle data errors gracefully: if a batch fails due to a bad row, it must catch the error, log it to a separate table/file , and continue processing the subsequent batches (Fault Tolerance).
- The application must integrate Socket.io to emit 'progress' events containing the percentage or row count to the client.
- The solution must strictly avoid loading the entire file into a variable or buffer; fs.readFile is a fail condition.
- The code must not use high-level "magic" libraries like csv-parse/sync that load everything into RAM; it must use streaming parsers or line-by-line reading.
- The database logic must use parameterized queries to prevent SQL injection during the bulk insert.

## Metadata
- Programming Languages: Node.js (v18+) ,Express.js , PostgreSql, Socket.io
- Frameworks: Express.Js
- Libraries: busboy , csv_parser, react_dropzone these are suggestions
- Databases: PostgreSQL
- Tools: Websocket
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
