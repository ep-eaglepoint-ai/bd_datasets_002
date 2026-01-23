# 0KBABS - Deterministic Concurrent Text & PDF Analytics Engine

**Category:** sft

## Overview
- Task ID: 0KBABS
- Title: Deterministic Concurrent Text & PDF Analytics Engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 0kbabs-deterministic-concurrent-text-pdf-analytics-engine

## Requirements
- Eliminate all package-level global variables
- Implement an Analyzer struct to hold all state, allowing for multiple instances to run concurrently without interference.
- Remove the "Time-of-Check to Time-of-Use" (TOCTOU) race in the word registry using a proper Double-Check Locking pattern or atomic map swaps.
- Fix the goroutine loop variable capture bug where workers process the same memory address.
- Remove all unsafe pointer conversions. Use standard Go strings/slices to ensure the Garbage Collector (GC) can track memory correctly.
- Replace readAllBroken with a streaming bufio.Scanner approach to handle files larger than available RAM.
- Implement a safe block-parsing state machine that handles escaped characters and nested objects without recursive stack risks.
- Linear O(N) time complexity relative to file size.
- No external C-dependencies; use pure Go for PDF byte-stream logic.

## Metadata
- Programming Languages: go
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`main.go`)
- repository_after/: optimized code (`main.go`)
- tests/: test suite (`*_test.go`)
- evaluation/: evaluation scripts (`evaluation.go`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start

Run tests repository_before:
  ```bash
  docker compose run --rm -e TEST_TARGET=before app go test -v ./tests/...
  ```
  
- Run  tests repository_after:
  ```bash
  docker compose run --rm app go test -v ./tests/...
  ```
- Run evaluation (Comparision):
  ```bash
  docker compose run --rm app go run evaluation/evaluation.go
  ```
- With Docker (interactive): `docker compose up --build`

## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
