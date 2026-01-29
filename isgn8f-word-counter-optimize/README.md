# ISGN8F - word counter optimize

**Category:** rl

## Overview
- Task ID: ISGN8F
- Title: word counter optimize
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: isgn8f-word-counter-optimize

## Requirements
- The original code reads the file multiple times for different analyses. Refactor to read the file once and compute all statistics in a single pass. Use generators or streaming for memory efficiency.
- Replace the manual counting loops with `collections.Counter`. The `get_top_words(n)` must use `Counter.most_common(n)` instead of sorting the entire dictionary.
- The `find_word_positions(word)` scans the text multiple times. Build an index once and reuse it. Use `str.find()` in a loop instead of checking each position.
- For large files, avoid loading entire content into memory. Process line by line or in chunks. The statistics must match the original implementation exactly.

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
