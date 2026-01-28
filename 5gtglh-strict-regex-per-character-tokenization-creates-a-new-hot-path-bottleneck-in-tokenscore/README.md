# 5GTGLH - STRICT: Regex-per-character tokenization creates a new hot-path bottleneck in tokenScore

**Category:** sft

## Overview
- Task ID: 5GTGLH
- Title: STRICT: Regex-per-character tokenization creates a new hot-path bottleneck in tokenScore
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5gtglh-strict-regex-per-character-tokenization-creates-a-new-hot-path-bottleneck-in-tokenscore

## Requirements
- Performance Requirement: Remove primary avoidable overheads  Missing: The solution must avoid introducing expensive operations (e.g., regex evaluation, engine calls) inside tight per-character or per-candidate loops.  Required: Inner loops must rely only on low-level, constant-time operations (primitive comparisons, arithmetic, direct indexing).
- Algorithmic Requirement: Practical scalability under worst-case inputs  Missing: Although asymptotic complexity appears linear, the implementation does not account for high constant factors that materially affect real-world performance at scale.  Required: Optimizations must consider both big-O complexity and realistic execution costs in the target runtime (Node.js / V8).
- Latency Requirement: Suitability for hot production paths  Missing: The refactor does not demonstrate that it avoids known throughput killers in JavaScript hot loops.  Required: The implementation must be safe to run within a strict p95 latency budget under peak load.
- Optimization Integrity Requirement  Missing: The refactor replaces one inefficiency with another of comparable or greater cost.  Required: Any refactor must result in a net reduction of work in the dominant execution path, not merely a reshuffling of costs.

## Metadata
- Programming Languages: JavaScript
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
