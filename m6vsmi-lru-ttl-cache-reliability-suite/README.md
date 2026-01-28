# M6VSMI - lru-Ttl-Cache-Reliability-Suite

**Category:** sft

## Overview
- Task ID: M6VSMI
- Title: lru-Ttl-Cache-Reliability-Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: m6vsmi-lru-ttl-cache-reliability-suite

## Requirements
- Achieve 100% code coverage, specifically ensuring the `_delete` and `prune_expired` methods are fully exercised.
- Implement a 'Stale Read' test: Insert an item, mock the system clock forward past the TTL, and verify `get` returns `None` and removes the key.
- Validate LRU ordering: Insert keys A, B, C (capacity 3). Access A. Insert D. Verify B is evicted, while A and C remain.
- Test 'Atomic Update': Verify that `put` on an existing key updates both its value and its expiration timestamp, and moves it to the most-recently-used position.
- Test `prune_expired`: Fill the cache with items, expire half of them via time mocking, and verify that `prune_expired` returns the correct count and the cache size decreases accordingly.
- Testing Requirement: Handle zero and negative capacity/ttl scenarios to ensure the component raises appropriate errors or behaves predictably.
- Testing Requirement: Perform a high-load simulation (1000+ operations) and verify that `len(self.cache)` never exceeds `self.capacity`.
- Testing Requirement: Verify that `get` on a non-existent key does not impact the LRU order of existing keys.

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

## Usage Commands

### Evaluation
- Run full evaluation (Before vs After):
  ```bash
  docker compose run --rm app python evaluation/evaluation.py
  ```
- Run evaluation with custom report output:
  ```bash
  docker compose run --rm app python evaluation/evaluation.py --output evaluation/report.json
  ```

### Testing
- Run 'Before' Package Tester:
  ```bash
  docker compose run --rm test-before
  ```
- Run 'After' Package Tester:
  ```bash
  docker compose run --rm tests
  ```

### Analysis
- View changes between implementations:
  ```bash
  git diff --no-index repository_before repository_after > patches/task_001.patch
  ```

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
