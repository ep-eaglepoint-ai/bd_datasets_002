# 3XXNUC - CSV Parser Bug Fix

**Category:** sft

## Overview
- Task ID: 3XXNUC
- Title: CSV Parser Bug Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 3xxnuc-csv-parser-bug-fix

## Requirements
- Pool size must never exceed maxSize (500 concurrent threads on maxSize=50 pool never shows >50 objects)
- Throughput remains >100 ops/sec with 500 concurrent threads even when validation takes 500ms
- Independent operations complete in parallel (two threads validating different objects don't serialize)
- Borrow timeout accurate within ±100ms (500ms timeout throws between 400-600ms)
- Zero timeout returns immediately without blocking if no object available
- Waiting threads wake when objects become available (no indefinite hangs while objects sit idle)
- Interrupted threads receive InterruptedException with interrupt status preserved
- Objects failing validation are never returned to callers
- Releasing object not from this pool does not corrupt pool state
- Factory exceptions during creation do not permanently reduce pool capacity
- Stress test: 10,000 cycles across 1,000 threads (1-50ms delays) with zero errors and capacity never exceeded
- Must use Java 17+ with standard library only (no external dependencies)
- Only modify ObjectPool.java, maintain existing public method signatures

## Metadata
- Programming Languages: Java
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
