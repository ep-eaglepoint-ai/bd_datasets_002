# EHS9G0 - Go Concurrent Task Scheduler with Worker Pool

**Category:** sft

## Overview
- Task ID: EHS9G0
- Title: Go Concurrent Task Scheduler with Worker Pool
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ehs9g0-go-concurrent-task-scheduler-with-worker-pool

## Requirements
- Worker pool must spawn exactly N goroutines where N is specified at creation. Call runtime.NumGoroutine() before Start() and after - the difference must equal workerCount. Creating a pool with 10 workers means exactly 10 goroutines processing tasks, not more, not less.
- Priority queue must use container/heap package from standard library. Solutions using separate channels per priority level fail this requirement because they cannot guarantee strict priority ordering when multiple tasks arrive simultaneously.
- Exponential backoff delays must be exactly 1 second, 2 seconds, and 4 seconds for retries 1, 2, and 3. Record timestamps of each retry attempt and verify differences are within 100ms of expected values. Delays like 1s, 2s, 8s or 500ms, 1s, 2s are incorrect.
- Task deduplication must return the identical channel reference for duplicate task IDs. Submitting task with ID "abc" twice must return the same channel - verify with chan1 == chan2 comparison returning true, not just channels that happen to produce the same result.
- Progress channel must be buffered with capacity of at least 10. A task sending progress updates must never block even if no goroutine is receiving from the channel. Unbuffered progress channels can deadlock the worker.
- The defer keyword must not appear inside for loops or the main worker processing loop. Defers inside loops accumulate across iterations and cause memory growth. Search the code for defer inside any for block - this is a failure.
- All imported packages must be used. Code importing "reflect", "strings", "fmt", or any package without using it indicates copy-paste errors. Run go vet - any unused import errors fail this requirement.
- Panic recovery must catch panics in task execution and convert them to error results. Submit a task that calls panic("test"), then submit a normal task - the second task must complete successfully on the same worker. Worker death from panic fails this requirement.
- Graceful shutdown must complete all in-flight tasks before returning. Start 10 tasks that each take 200ms, immediately call Shutdown(5s), verify all 10 tasks complete successfully. Tasks should not be abandoned mid-execution.
- After Shutdown() returns, runtime.NumGoroutine() must return to within 2 of the pre-Start() count. Wait 100ms after shutdown for cleanup, then check goroutine count. Any leak beyond 2 goroutines fails this requirement.
- Rate limiting must use token bucket algorithm. With rate limit of 5/sec for task type "email", submitting 15 email tasks must take at least 2.5 seconds total. Completing 15 tasks in under 2 seconds means rate limiting is broken.
- Stats must be accurate at all times with no race conditions. Run Stats() concurrently with Submit() 1000 times using go test -race. Any race detector warnings fail this requirement. Stats.Running must never exceed Stats.Submitted.
- Task timeout must cancel execution via context. A task with 100ms timeout that attempts to sleep 1 second must fail with context.DeadlineExceeded error. The failure must occur within 200ms, not after 1 second.
- Queue size limit must be enforced. With maxQueueSize=5 and a slow worker, attempting to submit the 7th task must either block until space available or return an error immediately based on configuration.
- Hard deadline shutdown must force return even with tasks still running. Call Shutdown(100ms) while tasks are running that take 1 second each - Shutdown must return within 200ms regardless of task state.
- High priority tasks must always execute before lower priority tasks when both are queued. Submit 3 Low tasks, then 3 High tasks while workers are busy. When workers become available, all High tasks must complete before any Low task starts.
- Code must compile and pass all tests with Go 1.21+ using only standard library. External dependencies like github.com packages are not allowed. The only imports should be from Go standard library.
- All public methods (NewScheduler, Start, Submit, Shutdown, Stats, SetRateLimit) must be safe for concurrent calls from multiple goroutines without external synchronization.

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
