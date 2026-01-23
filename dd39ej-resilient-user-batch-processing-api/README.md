# DD39EJ -  Resilient User Batch Processing Api

**Category:** sft

## Overview
- Task ID: DD39EJ
- Title:  Resilient User Batch Processing Api
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: dd39ej-resilient-user-batch-processing-api

## Requirements
- Process all valid users only if their id is not null or empty.
- Report invalid users without failing the batch, including users with invalid emails or null or empty ids.  Preserve the original input order.
- If a user is both invalid and has a duplicate id in the batch, report it only once while still processing other valid users with the same id.
- Return the count of valid users processed.
- Return the IDs of valid users processed.
- Return the count of invalid users.
- Return details of invalid users including the reason for invalidity.
- Do not throw exceptions inside the loop.
- Do not short-circuit processing on failure.
- Do not use streams.
- Separate validation logic from processing logic.
- Detect duplicates without using sets or maps for the entire list.

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
