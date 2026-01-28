# LV4RQJ - Order Processing Pipeline Test Code

**Category:** sft

## Overview
- Task ID: LV4RQJ
- Title: Order Processing Pipeline Test Code
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: lv4rqj-order-processing-pipeline-test-code

## Requirements
- Validate input immutability (array and item objects unchanged)
- Verify filtering boundaries minPriority and maxPriority at exact, below, and above limits
- Test randomness deterministically
- Verify artificial delay behavior

## Metadata
- Programming Languages: TypeScript
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



# Run tests against "after" implementation
docker compose build --no-cache; docker compose run --rm -e NODE_PATH=/app/repository_after app npm test -- --runInBand

<!-- # Example evaluation script (Node/TS) comparing both -->
<!-- docker compose run --rm app node evaluation/evaluation.js -->