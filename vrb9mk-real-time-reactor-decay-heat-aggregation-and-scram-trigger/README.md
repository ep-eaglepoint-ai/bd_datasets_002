# VRB9MK - Real-Time Reactor Decay Heat Aggregation and SCRAM Trigger

**Category:** sft

## Overview
- Task ID: VRB9MK
- Title: Real-Time Reactor Decay Heat Aggregation and SCRAM Trigger
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: vrb9mk-real-time-reactor-decay-heat-aggregation-and-scram-trigger

## Requirements
- The aggregation of thermal data from thousands of concurrent sources must not use a single global Mutex. It must use channels for fan-in, sync/atomic for counter accumulation, or a map-reduce pattern.
- The decay calculation must avoid simple math.Pow underflow for very small values. A robust implementation requires handling extremely small floats (subnormals) correctly or using large float standard library types if precision is lost.
- The SCRAM signal must be broadcast via a context.CancelFunc or a closed broadcast channel. Iterating through a list of actuators to send individual messages (which can block) is a failure.
- The data ingestion (network simulator) and data processing (thermal sum) must run in separate goroutine pools. Processing must not block ingestion.
- Executing go test -race on the codebase must pass. Any unsynchronized map writes or global state sharing is an immediate failure.
- If the processing loop is slower than ingestion, the input channel must be buffered, and the system must have a strategy (like dropping the oldest packets) rather than deadlocking.

## Metadata
- Programming Languages: Go (Golang) 1.21+
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: Numerical Precision (Bateman Equations), Fan-in Concurrency, Lock-Free Aggregation, Event-Driven Architecture.
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
