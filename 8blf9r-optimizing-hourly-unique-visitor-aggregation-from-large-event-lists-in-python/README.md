# 8BLF9R - Optimizing Hourly Unique Visitor Aggregation from Large Event Lists in Python

**Category:** sft

## Overview
- Task ID: 8BLF9R
- Title: Optimizing Hourly Unique Visitor Aggregation from Large Event Lists in Python
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8blf9r-optimizing-hourly-unique-visitor-aggregation-from-large-event-lists-in-python

## Requirements
- Correct uniqueness: Counts distinct visitor_ids per hour/page accurately; double-counting visitors = Fail.
- Handles unsorted events: Works regardless of timestamp order; assumes sorted = Fail.
- Memory efficiency: Avoids storing full sets if possible (or minimizes them); peak memory > original = Fail.
- Time complexity improvement: Targets O(n) with low constants; keeps original nested loops without optimization = Fail.
- Output structure preserved: Returns dict[hour_key][page_url] = int(count); different nesting or keys = Fail.
- Duplicates ignored correctly: Multiple same visitor/page/hour count as one; overcounts = Fail
- No external libs: Uses only stdlib (e.g., collections.defaultdict, set); imports pandas/numpy = Fail.
- voids building full sets then len(); len-while-adding or Counter = Fail if not used smartly.
- Bottleneck explanation: Comments correctly identify dict-of-dict-of-set churn as main issue; wrong diagnosis = Fail.

## Metadata
- Programming Languages: python 3.10
- Frameworks: (none)
- Libraries: Only standard library (datetime, collections allowed)
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
