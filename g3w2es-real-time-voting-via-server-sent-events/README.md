# G3W2ES - Real-Time Voting via Server-Sent Events 

**Category:** sft

## Overview
- Task ID: G3W2ES
- Title: Real-Time Voting via Server-Sent Events 
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: g3w2es-real-time-voting-via-server-sent-events

## Requirements
- Must NOT use external Go frameworks (Gin/Echo/Gorilla).
- Must use sync.Mutex or sync.RWMutex to protect the votes map.
- Must implement Server-Sent Events (SSE) on the /events endpoint.
- SSE endpoint must set Content-Type: text/event-stream and Cache-Control: no-cache
- The SSE handler must use http.Flusher and call .Flush() after sending data.
- Must use the native EventSource API to consume the stream.
- When a POST occurs, the update must be reflected on connected clients (Push or Polling within <1s is acceptable for "Easy")
- The server must not crash if a client disconnects (broken pipe handling).
- Data sent over SSE must follow the strict data: <payload>\n\n format.

## Metadata
- Programming Languages: Go (Standard Lib), HTML5, JavaScript (EventSource).
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
