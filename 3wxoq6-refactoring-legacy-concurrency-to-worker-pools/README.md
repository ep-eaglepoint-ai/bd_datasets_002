# 3WXOQ6 - Refactoring Legacy Concurrency to Worker Pools

**Category:** sft

## Overview
- Task ID: 3WXOQ6
- Title: Refactoring Legacy Concurrency to Worker Pools
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 3wxoq6-refactoring-legacy-concurrency-to-worker-pools

## Requirements
- The solution must eliminate all usage of global variables, specifically the metricsCache.
- You must define a MetricStore interface that strictly requires Inc(key string) and Get(key string) int methods to decouple storage from processing.
- The concrete implementation of MetricStore must utilize a sync.RWMutex (not just a standard Mutex) to allow safe concurrent reads and exclusive writes to the underlying map
- Incoming logs must be passed to workers via a buffered channel to handle bursts of traffic without blocking the producer immediately.
- The main processing method must accept a context.Context parameter to control the application lifecycle and trigger shutdown.
- The application must implement graceful shutdown logic: when the context is cancelled, active workers must complete their current processing tasks before exiting.
- The AsyncCollector struct must be designed to accept the MetricStore interface via dependency injection (constructor) rather than initializing the specific map implementation internally.
- The solution must be separated into two distinct files: store.go for the interface and storage logic, and collector.go for the worker pool and concurrency logic.
- The concurrency logic must use a select statement inside the worker loops to listen for both the jobs channel and the ctx.Done() channel to ensure immediate responsiveness to cancellation signals.

## Metadata
- Programming Languages: GoLang(Go 1.20+)
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
