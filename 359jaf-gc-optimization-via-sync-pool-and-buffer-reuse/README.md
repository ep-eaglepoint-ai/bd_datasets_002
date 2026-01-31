# 359JAF - GC Optimization via sync.Pool and Buffer Reuse

**Category:** sft

## Overview
- Task ID: 359JAF
- Title: GC Optimization via sync.Pool and Buffer Reuse
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 359jaf-gc-optimization-via-sync-pool-and-buffer-reuse

## Requirements
- Must use sync.Pool.
- Must NOT use external libraries.
- Must reuse bytes.Buffer (or equivalent) via the pool.
- Must call buf.Reset() before putting the object back in the pool (or before use)
- Must use defer or explicit Put to ensure buffers are returned even if errors occur.
- The optimized function must utilize json.NewEncoder(buf).Encode() (or similar) writing into the pooled buffer, rather than json.Marshal which allocates a new slice internally.
- Must handle the io.Writer interface correctly without buffering indefinitely.
- The JSON output must remain valid and identical to the original structure.
- (Implicit) Allocations per op should drop significantly (e.g., from 5 allocs/op to 0-1 allocs/op).

## Metadata
- Programming Languages: Golang 1.18+
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
