# R7TCX0 - Custom RLE Compressed Telemetry Pipeline

**Category:** sft

## Overview
- Task ID: R7TCX0
- Title: Custom RLE Compressed Telemetry Pipeline
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: r7tcx0-custom-rle-compressed-telemetry-pipeline

## Requirements
- The solution must use aiohttp for the Python backend and native DOM APIs (Vanilla JS) for the frontend.
- The client must generate a 100x100 matrix (10,000 items) of random integers ranging from 0 to 255.
- The developer must implement a custom Run-Length Encoding (RLE) algorithm from scratch. Usage of gzip, zlib, or any compression imports is strictly forbidden.
- The compressed data must be structured as a sequence of byte pairs: [Count (1 byte), Value (1 byte)]
- The "Count" byte must not exceed 255. If a run of identical values is longer than 255, the algorithm must logically split it into multiple pairs (e.g., 300 A's -> [255, A], [45, A])
- The frontend must send the compressed data as a raw binary body (ArrayBuffer/Blob) via HTTP POST, setting the Content-Type to application/octet-stream
- The Python backend must interpret the incoming raw bytes and reconstruct the original 10,000-element list/matrix logic manually
- After decompression, the server must calculate the arithmetic mean (average) of all 10,000 sensor values.
- The server must return the result as a JSON object: {"average": <float_value>}.
- The implementation must correctly handle byte conversions, ensuring integers are treated as unsigned 8-bit values (0-255) on both ends.
- The solution should ideally be structured to run easily, e.g., the Python server serving the HTML file string, or clearly separated server.py and index.html blocks.
- The server must safely handle cases where the binary stream length is odd (which would indicate a corrupted RLE stream, as pairs are required).

## Metadata
- Programming Languages: Python (3.9+) , JavaScript (ES6+),
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
