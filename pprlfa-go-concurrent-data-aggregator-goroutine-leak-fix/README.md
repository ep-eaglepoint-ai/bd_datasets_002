# PPRLFA - Go Concurrent Data Aggregator Goroutine Leak Fix

**Category:** sft

## Overview
- Task ID: PPRLFA
- Title: Go Concurrent Data Aggregator Goroutine Leak Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: pprlfa-go-concurrent-data-aggregator-goroutine-leak-fix

## Requirements
- Fix goroutine leak in FetchAndAggregate where worker goroutines block forever on channel send when timeout occurs before all workers complete. Workers must have guaranteed exit path via context cancellation, not remain blocked on unbuffered channel sends.
- Fix goroutine leak in ProcessBatch where spawned goroutines block on unbuffered channel sends when the receiver loop exits early due to context cancellation. Use buffered channels or select with context to ensure all goroutines can exit regardless of receiver state.
- Fix goroutine leak in StreamResults where goroutines have no coordination and block forever if the output channel receiver stops consuming. Must handle context cancellation while preserving the original fire-and-forget return behavior where function returns immediately while goroutines run in background.
- Propagate context cancellation to all spawned goroutines. When parent context is cancelled, all child goroutines must detect cancellation via select on ctx.Done() and exit promptly rather than continuing work or blocking on channel operations.
- Use buffered channels sized appropriately to prevent goroutine blocking on sends. For FetchAndAggregate and ProcessBatch, channel buffer size should match the number of expected senders so sends never block even if receiver exits early.
- Ensure proper channel closing semantics. Only senders should close channels, and closing must happen exactly once after all senders complete. Use WaitGroup to coordinate when all senders are done before closing.
- Clean up timer resources properly. Call timer.Stop() to prevent timer goroutine leaks. After Stop(), drain the timer channel using select with default case to prevent blocking if timer already fired.
- Preserve original function signatures and return types. FetchAndAggregate, ProcessBatch, and StreamResults must maintain identical APIs for backward compatibility. StreamResults must return immediately (fire-and-forget) not block waiting for goroutines.
- Maintain concurrent execution behavior. Data sources must still be fetched concurrently using goroutines, not sequentially. Fix must not serialize operations or significantly degrade throughput performance.
- Handle edge cases correctly: empty source list returns empty result without spawning goroutines, single source works without deadlock, all sources failing returns all errors, context already cancelled on function entry returns immediately with context error.

## Metadata
- Programming Languages: Go
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
