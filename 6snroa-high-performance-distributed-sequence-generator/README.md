# 6SNROA - High-Performance Distributed Sequence Generator

**Category:** sft

## Overview
- Task ID: 6SNROA
- Title: High-Performance Distributed Sequence Generator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 6snroa-high-performance-distributed-sequence-generator

## Requirements
- The solution must implement a class named ChronoSequence with an __init__ method accepting worker_id and a main method next_id(self) -> int.
- The solution must use only the standard Python time module; no external libraries or UUID packages are permitted
- Timestamp calculations must use a custom epoch start date of January 1, 2024, at 00:00:00 UTC, not the standard Unix epoch (1970)
- The final 64-bit integer must be assembled exclusively using bitwise left-shifts (<<) and bitwise OR (|). The use of string formatting, f-strings, or binary string concatenation is strictly forbidden
- The ID must strictly follow the structure: [1 bit (0)] + [41 bits (Timestamp)] + [10 bits (Worker ID)] + [12 bits (Sequence)].
- If next_id is called multiple times within the same millisecond, the sequence number must increment by 1 for each call.
- When the system clock advances to a new millisecond (time > last_time), the sequence number must reset to 0.
- The last_timestamp and sequence must be stored as instance attributes to maintain state across method calls.
- The method must return a native Python integer representing the final 64-bit value.

## Metadata
- Programming Languages: Python (3.9)
- Frameworks: (none)
- Libraries: time (the only permitted module)
- Databases: (none)
- Tools: (none)
- Best Practices: Bitwise Arithmetic , Binary Layouts , Clock Skew
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
