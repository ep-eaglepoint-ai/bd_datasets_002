# HWLPR6 - Go API Gateway Performance Optimization

**Category:** sft

## Overview
- Task ID: HWLPR6
- Title: Go API Gateway Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hwlpr6-go-api-gateway-performance-optimization

## Requirements
- P99 latency must stay under 50ms when handling 2000 concurrent requests. The current implementation spikes to 800ms+ which is unacceptable for production traffic.
- Memory usage must not exceed 500MB under sustained load. Currently memory grows unbounded because request logs are stored in a slice that is never pruned or bounded.
- CPU utilization must stay under 70% at peak traffic. The current implementation hits 100% due to redundant request body parsing across multiple middleware functions.
- Request body must be readable by multiple middleware in the chain without re-reading from the connection. Currently each middleware calls io.ReadAll separately, causing redundant I/O and memory allocation.
- All existing middleware functionality must be preserved. The gateway must continue to provide logging, authentication, rate limiting, validation, compression handling, and metrics collection.
- The system must handle graceful degradation under extreme load. No panics or crashes should occur, and the gateway should return appropriate HTTP status codes when overwhelmed.
- Zero goroutine leaks after load test completion. Background goroutines for metrics, logging, or cleanup must be properly managed and terminate when the server shuts down.
- Memory must return to baseline within 30 seconds after load test ends. This requires proper cleanup of temporary allocations, connection pools, and cached data.
- Must use Go 1.21 standard library only. No external frameworks like gin, echo, or chi are permitted.
- Must maintain compatibility with existing middleware interface signature: type Middleware func(http.Handler) http.Handler
- Cannot change the API contract with backend services. Request forwarding must preserve headers, method, path, and body exactly as received.
- Must support request bodies up to 10MB. Bodies larger than 10MB should return HTTP 413 Request Entity Too Large.

## Metadata
- Programming Languages: Go
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
