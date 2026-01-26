# WTC8VR - Optimize a Pointer-Heavy Go Service with High GC Overhead

**Category:** sft

## Overview
- Task ID: WTC8VR
- Title: Optimize a Pointer-Heavy Go Service with High GC Overhead
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wtc8vr-optimize-a-pointer-heavy-go-service-with-high-gc-overhead

## Requirements
- Reduce heap allocations in hot paths
- Minimize pointer indirection and GC scan pressure
- Replace pointer-heavy structures with value types where possible
- Introduce object and buffer reuse (e.g., pooling)
- Eliminate redundant data copies and string formatting
- Simplify or remove background routines that retain memory
- Improve slice and map usage (preallocation, proper release)
- Maintain functional correctness and observable behavior
- Provide measurable improvement in GC frequency and memory usage
- Code must remain idiomatic Go and easy to reason about

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
