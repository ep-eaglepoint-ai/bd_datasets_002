# E486DF - FastAPI Minimal Example – Fully Dockerized

**Category:** sft

## Overview
- Task ID: E486DF
- Title: FastAPI Minimal Example – Fully Dockerized
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: e486df-fastapi-minimal-example-fully-dockerized

## Requirements
- The application must expose a POST endpoint at /reverse-string
- The endpoint must accept a JSON payload containing a string with the key "text"
- The response must be a JSON object with the key "reversed", containing the reversed version of the input string.
- The application must be fully containerized using Docker, with no external dependencies required for local execution.
- The service must be configurable and runable via Docker Compose.
- The service must be accessible on port 8000.
- The application should run using Uvicorn as the ASGI server.
- The solution must be production-ready with clear, properly named files.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: Uvicorn
- Databases: (none)
- Tools: Docker
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
