# 7PF97A - Eliminate GC Thrashing and Excessive Allocations in High-Throughput Telemetry Ingestion Engine

**Category:** sft

## Overview
- Task ID: 7PF97A
- Title: Eliminate GC Thrashing and Excessive Allocations in High-Throughput Telemetry Ingestion Engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 7pf97a-eliminate-gc-thrashing-and-excessive-allocations-in-high-throughput-telemetry-ingestion-engine

## Requirements
- Must be implemented in Go
- Must process 1,000,000 packets per second
- Must use fewer than 10 total heap allocations during steady-state operation
- Must have near-zero allocations in the Push method
- Must keep memory usage flat after initialization (no growth during bursts)
- Must not modify the existing TelemetryPacket struct
- Must not use unsafe pointers or unsafe memory operations
- Must result in fewer than 5 GC cycles when processing 1M packets in main.go
- Must achieve at least 3× higher throughput compared to the current implementation
- Must eliminate GC-induced throughput degradation during sustained ingestion
- Must preserve thread safety and correctness of the ingestion buffer

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
