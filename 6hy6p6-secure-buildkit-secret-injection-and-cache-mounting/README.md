# 6HY6P6 - Secure BuildKit Secret Injection and Cache Mounting

**Category:** sft

## Overview
- Task ID: 6HY6P6
- Title: Secure BuildKit Secret Injection and Cache Mounting
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 6hy6p6-secure-buildkit-secret-injection-and-cache-mounting

## Requirements
- Secret Injection: Must use RUN --mount=type=secret,id=ssh_key .... Usage of ARG for the key is an automatic failure.
- The code must configure git to use the mounted secret (e.g., git config --global url..."ssh://"...).
- Must use RUN --mount=type=cache for the go mod download or build step.
- Final stage must be scratch or distroless. alpine or debian is a failure (not minimal enough per prompt).
- Must use ARG TARGETOS and ARG TARGETARCH and pass them to the go build command (e.g., GOARCH=$TARGETARCH).
- The Go build command must usually include CGO_ENABLED=0 to run on scratch.
- The secret file must not be copied to the final image.

## Metadata
- Programming Languages: Golang
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: Docker  build kit
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
