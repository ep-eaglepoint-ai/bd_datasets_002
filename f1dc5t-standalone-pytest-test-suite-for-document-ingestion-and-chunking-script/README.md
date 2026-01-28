# F1DC5T - Standalone Pytest Test Suite for Document Ingestion and Chunking Script

**Category:** sft

## Overview
- Task ID: F1DC5T
- Title: Standalone Pytest Test Suite for Document Ingestion and Chunking Script
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: f1dc5t-standalone-pytest-test-suite-for-document-ingestion-and-chunking-script

## Requirements
- The test suite must be written in Python using pytest and be executable without modifying the original script.
- Tests must assume the script is standalone, runnable via python ingest_and_chunk.py, with no package-relative imports.
- Unit tests must validate the basic_clean function, ensuring it removes control characters, normalizes Unicode and newlines, collapses excessive whitespace, and returns clean, non-empty output for valid input.
- Unit tests must validate the chunk_text function, confirming correct chunk sizes based on the token-to-character approximation, correct overlap between adjacent chunks, and proper error handling when overlap is invalid.
- Tests must verify that the document discovery logic correctly processes .txt and .md files, ignores unsupported file types, and returns records with the required fields (id, type, path, text).
- An integration test must execute the script using a subprocess, generate a JSONL output file from temporary input data, and validate that each output record contains all required keys and correctly formatted chunk identifiers.
- All tests must use temporary directories or files, avoid external dependencies or network access, and provide clear, explicit assertions with meaningful failure messages.

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
