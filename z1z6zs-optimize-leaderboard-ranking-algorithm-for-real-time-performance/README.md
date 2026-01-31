# Z1Z6ZS - Optimize Leaderboard Ranking Algorithm for Real-Time Performance

**Category:** sft

## Overview
- Task ID: Z1Z6ZS
- Title: Optimize Leaderboard Ranking Algorithm for Real-Time Performance
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: z1z6zs-optimize-leaderboard-ranking-algorithm-for-real-time-performance

## Requirements
- Preserve exact leaderboard output
- Maintain stable ordering for equal scores
- Optimize performance to O(n log n)
- Ensure deterministic and reproducible rankings
- Support millions of score entries
- No change in tie-handling behavior

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
