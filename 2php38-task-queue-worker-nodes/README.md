# 2PHP38 - task queue worker nodes

**Category:** sft

## Overview
- Task ID: 2PHP38
- Title: task queue worker nodes
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 2php38-task-queue-worker-nodes

## Requirements
- Design a multi-level priority queue system with at least 5 priority levels (critical, high, normal, low, batch), implementing fair scheduling algorithms that prevent priority inversion and starvation, with configurable priority weights and the ability to dynamically adjust job priorities after enqueuing
- Build a dependency management system that allows jobs to declare prerequisites, automatically resolving the execution order using topological sorting, detecting circular dependencies at submission time, and efficiently triggering dependent jobs when prerequisites complete successfully
- Implement worker node registration and heartbeat monitoring, automatic work stealing for load balancing across workers, graceful shutdown handling with job reassignment, and leader election for coordination tasks using Redis-based distributed locking
- Create a sophisticated retry mechanism with configurable strategies (fixed delay, exponential backoff with jitter, custom retry schedules), maximum attempt limits, dead-letter queue routing for exhausted retries, and failure callbacks for alerting
- Develop a scheduler supporting delayed job execution with millisecond precision, cron-like recurring job definitions with timezone support, job uniqueness constraints to prevent duplicate execution, and bulk job submission with transactional semantics
- Implement comprehensive observability including queue depth gauges per priority level, job processing latency histograms, worker utilization metrics, throughput counters, and a REST API for job inspection and queue management operations
- Design a pluggable serialization system supporting JSON, MessagePack, and pickle with compression options, enforce type-safe job definitions using Python generics and Pydantic models, and implement job versioning for backward-compatible payload evolution

## Metadata
- Programming Languages: Python
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
