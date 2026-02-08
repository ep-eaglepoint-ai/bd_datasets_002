# Trajectory: Actions Taken to Resolve Goroutine Leaks

This document outlines the specific actions taken to fix the memory exhaustion issues caused by goroutine leaks in the concurrent data aggregator.

## Action 1: Prevent Blocking on Timeout in `FetchAndAggregate`
**Issue**: Workers blocked on unbuffered channels when the main process timed out.

*   **Action Taken**: Implemented buffered channels and context propagation.
    *   Updated `resultChan := make(chan Result)` to `make(chan Result, len(sources))` to ensure senders never block.
    *   Created a child context with `context.WithCancel(ctx)` to signal workers to stop when the main function returns.
    *   Added a `select` block in worker goroutines to handle `<-workerCtx.Done()`.
*   **Reference**: 
    *   **[Go Blog: Pipelines and cancellation](https://go.dev/blog/pipelines)** - Established the pattern for using a "done" channel/context to stop pipelines.
    *   **[Go Wiki: Goroutine Leaks](https://github.com/golang/go/wiki/CommonMistakes#goroutine-leaks)** - Identified the "blocking on send" pattern as a primary cause of leaks.

## Action 2: Fix Resource Cleanup in `FetchAndAggregate`
**Issue**: Timers were leaking goroutines because they weren't properly stopped and drained.

*   **Action Taken**: Added defensive timer cleanup.
    *   Implemented `defer` block to call `timer.Stop()`.
    *   Added logic to drain the timer channel `<-timer.C` if the timer had already fired, preventing the timer's internal goroutine from lingering.
*   **Reference**: 
    *   **[Go Documentation: Timer.Stop](https://pkg.go.dev/time#Timer.Stop)** - Details the required pattern for draining the channel when `Stop` returns false.
    *   **[Go 1.23 Release Notes](https://go.dev/doc/go1.23#timer-cleanup)** - Reviewed for modern timer behavior (though used the compatible pattern for safety).

## Action 3: Resolve Context Cancellation Leaks in `ProcessBatch`
**Issue**: Batch processors remained active after the receiver loop exited due to context cancellation.

*   **Action Taken**: Synchronized channel closing and automated worker termination.
    *   Switched to buffered channels for `resultChan` and `errChan`.
    *   Used `sync.WaitGroup` to track all batch goroutines.
    *   Moved channel closing to a background goroutine that waits for the `WaitGroup`, ensuring channels are closed exactly once after all work is confirmed finished.
*   **Reference**: 
    *   **[Uber Go Style Guide: Wait for goroutines to exit](https://github.com/uber-go/guide/blob/master/style.md#wait-for-goroutines-to-exit)** - Standard industry practice for ensuring background workers are cleaned up before returning.

## Action 4: Secure Fire-and-Forget Goroutines in `StreamResults`
**Issue**: Background streaming goroutines had no exit path if the consumer stopped reading.

*   **Action Taken**: Implemented context-aware select in streamers.
    *   Modified producers to use `select` when sending to the `out` channel.
    *   Added a check for `<-ctx.Done()` to allow workers to exit gracefully if the stream is no longer needed.
*   **Reference**: 
    *   **[Effective Go: Channels](https://go.dev/doc/effective_go#channels)** - Clarified the necessity of providing exit paths for background tasks.

## Verification Action: Automated Leak Detection
**Action Taken**: Developed a non-deterministic leak detection test.
*   Implemented `runtime.NumGoroutine()` checks in `aggregator_test.go`.
*   Created tests that specifically simulate blocked receivers and timeouts to verify that the goroutine count returns to the baseline after each operation.