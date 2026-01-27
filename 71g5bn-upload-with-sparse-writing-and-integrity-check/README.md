# 71G5BN -  Upload with Sparse Writing and Integrity Check

**Category:** sft

## Overview
- Task ID: 71G5BN
- Title:  Upload with Sparse Writing and Integrity Check
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 71g5bn-upload-with-sparse-writing-and-integrity-check

## Requirements
- The backend must use fs.open() and fs.write(fd, buffer, offset, ...) (or similar random-access API). Using fs.appendFile or a generic write stream without positioning is an automatic Fail.
- The frontend must send multiple chunks simultaneously (e.g., Promise.all with a concurrency limit). Sending chunks strictly one-by-one is a performance failure.
- The frontend must use File.prototype.slice(start, end) to generate chunks
- Re-uploading an existing chunk (duplicate) must overwrite the data safely or be ignored without error, not append to the file and corrupt the size.
- The system must implement a "Handshake" endpoint (e.g., HEAD /upload/:id) that returns the current uploaded size or a bitmap of received chunks
- The backend must compute the final SHA-256 hash of the file on disk and compare it with the client-provided hash.
- The backend must not load the entire file into RAM. It must stream data to disk. Reading req.body into a single variable for a 5GB file is a failure.
- The frontend must implement a "Worker Queue" pattern to limit active HTTP requests (e.g., max 3). Firing 1000 requests for a 5GB file simultaneously is a failure.
- The backend must parse the Content-Range or custom headers to determine the start byte position of the incoming chunk
- The backend must properly open and close file descriptors. Leaking FDs on every chunk upload is a failure.
- TypeScript interfaces for Chunk, UploadStatus, and WorkerQueue must be defined.
- After the final chunk, the file size on disk must exactly match the totalSize reported by the frontend.

## Metadata
- Programming Languages: TypeScript, Node js (18+)
- Frameworks: React 18
- Libraries: axios, fs
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
