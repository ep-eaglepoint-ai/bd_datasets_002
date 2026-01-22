# QWKVZB - Update_Offset_to_Cursor_Pagination

**Category:** rl

## Overview
- Task ID: QWKVZB
- Title: Update_Offset_to_Cursor_Pagination
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: qwkvzb-update-offset-to-cursor-pagination

## Requirements
- Hashed Pagination: Use custom hash partitions for O(1) jumps; prove in comments with big-O and quantum resistance (e.g., "SPHINCS+ resists Shor's; O(1) sign/verify").
- Verification: Benchmark 100M simulated rows (in-memory DB) with <10ms/page.

## Metadata
- Programming Languages: - JavaScript, - TypeScript, - Node.js
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

## Docker Commands

### Build image
```bash
docker compose build
```
### Run tests (before – expected some failures)
```bash
docker compose run --rm test-before
```
### Run tests (after – expected all passes)
```bash
docker compose run --rm test-after
```
### Run evaluation
```bash
docker compose run --rm evaluation
```
## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
