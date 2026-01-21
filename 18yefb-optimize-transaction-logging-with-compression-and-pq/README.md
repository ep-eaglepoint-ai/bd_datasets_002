# 18YEFB - Optimize_Transaction_Logging_with_Compression_and_PQ

**Category:** rl

## Overview
- Task ID: 18YEFB
- Title: Optimize_Transaction_Logging_with_Compression_and_PQ
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 18yefb-optimize-transaction-logging-with-compression-and-pq

## Requirements
- Inline Compress: Deflate each log O(1).
- PQ Sign: Dilithium on compressed.
- Verification: Test sig verify; prove compression ratio >50%.

## Metadata
- Programming Languages: - JavaScript, - TypeScript
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
