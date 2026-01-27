# SH87H5 - Django-Chunked-Stateful-Uploader

**Category:** sft

## Docker commands
- Tests:
	- docker compose run --rm tests dotnet test tests/tests.csproj --filter RepositoryAfterChunkedUploaderTests -c Release --no-build -v minimal
- Pytest (repository_before):
	- docker compose run --rm -e PYTHONPATH=/app/repository_before app pytest -q
- Pytest (repository_after):
	- docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest -q
- Evaluation:
	- docker compose run --rm tests dotnet run --project evaluation/evaluation.csproj -- --iterations 5 --skills 160,320,640 --slots 20,40,80 --threshold 15 --output-dir evaluation
	- docker compose run --rm app python evaluation/evaluation.py

## Overview
- Task ID: SH87H5
- Title: Django-Chunked-Stateful-Uploader
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: sh87h5-django-chunked-stateful-uploader

## Requirements
- Backend Model: Create a `FileSession` model that stores the file's unique signature (SHA-256), total size, chunk size, and a binary/text mapping of successfully uploaded chunk indices.
- Handshake Logic: Implement a view that, given a file's hash, returns the list of missing chunk indices. If the file hash exists and is fully assembled, return a 'File Exists' status to prevent duplicate uploads.
- Chunk Ingestion: Create a POST view to receive a single chunk as a file upload. This view must validate the chunk's integrity, save it to a temporary staging directory named after the session ID, and update the session's completion map.
- Atomic Reassembly: Upon receiving the final chunk, the backend must trigger a background process or atomic utility to merge the chunks in the correct sequence. The final file must be verified against the original client-provided hash before deleting the temporary segments.
- Frontend Integration: Within a Django template, implement a JavaScript 'Upload Manager' that uses `File.slice()` to generate 5MB chunks. It must handle the handshake and sequentially (or in parallel) transmit chunks while providing a basic progress indicator.
- Cleanup: Implement a Django management command to identify and purge incomplete `FileSession` records and their orphaned temporary disk segments that have not been updated in over 48 hours.
- Testing: Provide a Django `TestCase` that: 1. Simulates an interrupted upload of a 15MB file (3 chunks). 2. Verifies that the handshake correctly identifies the missing 2nd and 3rd chunks. 3. Asserts that the final reassembled file is byte-identical to the source. 4. Confirms that an invalid chunk size or out-of-order chunk is handled without corrupting the session state.

## Metadata
- Programming Languages: Python
- Frameworks: Django
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
