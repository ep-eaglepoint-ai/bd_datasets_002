# TSX0GU - Reverse Words in a Sentence Under Legacy Python Restrictions

**Category:** sft

## Overview
- Task ID: TSX0GU
- Title: Reverse Words in a Sentence Under Legacy Python Restrictions
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tsx0gu-reverse-words-in-a-sentence-under-legacy-python-restrictions

## Requirements
- Must return the sentence with words in reverse order while keeping letters within each word unchanged.
- Must not add or remove spaces (assume words are separated by single spaces).
- Must process the input string from right to left.
- Must use exactly one while loop and no for loops.
- Must not use split(), join(), reversed(), or slicing with negative steps ([::-1]).
- Must build the output using only string concatenation (+).

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
