# YPFQTF - Python Task Queue with Retry Logic - Test Suite Development

**Category:** sft

## Overview
- Task ID: YPFQTF
- Title: Python Task Queue with Retry Logic - Test Suite Development
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ypfqtf-python-task-queue-with-retry-logic-test-suite-development

## Requirements
- Successful task execution must complete and return results. A registered handler that returns normally should mark the task as COMPLETED, store the result, and set completed_at timestamp. The handler must be called exactly once with the task's payload.
- Failed tasks must trigger automatic retry with exponential backoff. When a handler raises an exception, the task should increment retry_count, record the error in retry_history, calculate backoff delay as base_delay * 2^retry_count (capped at 300 seconds), and return to PENDING status for re-processing.
- Max retries reached must move task to dead letter queue with full history. After exhausting max_retries attempts, the task status should become DEAD, and a DeadLetterEntry should be created containing the task with complete retry_history (all attempts, errors, and timestamps) and a reason string.
- Task timeout must kill long-running handlers and trigger retry. Handlers exceeding timeout_seconds should be cancelled via asyncio.TimeoutError, treated as a failure with error "Task timeout exceeded", and follow the same retry logic as other failures.
- Priority ordering must be respected during processing. Tasks with HIGH priority (value=1) must be processed before NORMAL (value=2), which must be processed before LOW (value=3). Tasks with equal priority should be processed in creation order (FIFO).
- Cancelled tasks must not be executed. Calling cancel() on a PENDING task should set its status to CANCELLED. When the worker retrieves this task, it should skip execution entirely and the handler should never be invoked.
- Duplicate task IDs must be handled idempotently. Calling enqueue() with a task ID that already exists should return False without modifying the existing task or adding a duplicate to the queue. Only the first enqueue succeeds.
- Backoff calculation must not overflow for high retry counts. Computing backoff for retry_count=100 or higher must not raise exceptions or produce infinity/NaN. The result should be capped at max_delay (300 seconds) regardless of how large 2^retry_count would be.

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
