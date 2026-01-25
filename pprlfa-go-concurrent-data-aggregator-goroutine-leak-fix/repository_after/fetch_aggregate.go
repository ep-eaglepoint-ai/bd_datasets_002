package aggregator

import (
	"context"
	"errors"
	"sync"
	"time"
)

// FetchAndAggregate fetches data from multiple sources concurrently and aggregates the results.
func FetchAndAggregate(ctx context.Context, sources []DataSource, timeout time.Duration) (*AggregatedResult, error) {
	// Handle edge case: empty source list
	if len(sources) == 0 {
		return &AggregatedResult{
			Results: make([]Result, 0),
			Errors:  make([]error, 0),
		}, nil
	}

	// Check if context is already cancelled - return immediately without spawning goroutines
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	// Create buffered channel sized to number of sources to prevent blocking
	resultChan := make(chan Result, len(sources))

	var wg sync.WaitGroup

	// Create a cancellable context for workers
	workerCtx, cancel := context.WithCancel(ctx)
	defer cancel() // Ensure workers are always cancelled on return

	// Spawn worker goroutines with context cancellation support
	for _, source := range sources {
		wg.Add(1)
		go func(s DataSource) {
			defer wg.Done()

			// Check for cancellation before starting work
			select {
			case <-workerCtx.Done():
				return
			default:
			}

			data, err := fetchFromSource(s)

			// Use select to allow cancellation during send
			select {
			case resultChan <- Result{
				SourceID: s.ID,
				Data:     data,
				Error:    err,
			}:
			case <-workerCtx.Done():
				// Context cancelled, exit without blocking
				return
			}
		}(source)
	}

	// Close channel after all workers complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	aggregated := &AggregatedResult{
		Results: make([]Result, 0),
		Errors:  make([]error, 0),
	}

	timeoutTimer := time.NewTimer(timeout)
	defer func() {
		// Stop timer and drain channel to prevent timer goroutine leak
		if !timeoutTimer.Stop() {
			select {
			case <-timeoutTimer.C:
			default:
			}
		}
	}()

	// Collect results until timeout or all complete
	for {
		select {
		case <-ctx.Done():
			// Context cancelled - highest priority
			cancel()
			return aggregated, ctx.Err()
		case <-timeoutTimer.C:
			// Timeout occurred, cancel all workers and return
			cancel()
			return aggregated, errors.New("aggregation timeout")
		case result, ok := <-resultChan:
			if !ok {
				// Channel closed, all workers completed
				// Check if context was cancelled during execution
				if ctx.Err() != nil {
					return aggregated, ctx.Err()
				}
				return aggregated, nil
			}
			if result.Error != nil {
				aggregated.Errors = append(aggregated.Errors, result.Error)
			} else {
				aggregated.Results = append(aggregated.Results, result)
			}
			// Check for cancellation after processing each result
			// This ensures we detect cancellation even if all results arrive
			select {
			case <-ctx.Done():
				cancel()
				return aggregated, ctx.Err()
			default:
				// Continue processing
			}
		}
	}
}
