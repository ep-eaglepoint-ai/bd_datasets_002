# XMHEYB - Traffic Mirroring with Request Body Preservation

**Category:** sft

## Overview
- Task ID: XMHEYB
- Title: Traffic Mirroring with Request Body Preservation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xmheyb-traffic-mirroring-with-request-body-preservation

## Requirements
- he code must read the req.Body into a byte buffer exactly once and create two distinct io.NopCloser(bytes.NewReader(...)) instances. Reusing the original req.Body for the second request is an automatic failure
- The Shadow request must run inside a go func() or a dedicated worker pool. Using blocking calls (sequential execution) is a failure.
- he Shadow request must not use the original r.Context(). Since the handler returns immediately after the Live response, the original context is canceled, which would kill the shadow request. The code must create a new context (e.g., context.Background()) for the shadow operation.
- When replacing the req.Body with a new buffer, the code must update req.ContentLength to match the buffer size to ensure valid HTTP transport behavior.
- The handler must return the status code and body from the Live Upstream. The Shadow response must be discarded or logged, never returned to the client.
- The background goroutine for the shadow request must include a defer recover() block to prevent a panic in the shadow logic from crashing the entire application process.
- The original req.Body must be closed to prevent file descriptor leaks.
- The Shadow request must receive a copy of the headers. Modifying headers on the shared req object is a race condition; a new request object with copied headers is required.
- The Shadow request must explicitly use the same HTTP method (POST) and URL/Path logic as the incoming request.
- The Live request logic must not contain any channel waits or WaitGroup.Wait() calls that depend on the Shadow request.

## Metadata
- Programming Languages: Go (Golang 1.18+)
- Frameworks: (none)
- Libraries: net/http, io, bytes.
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
