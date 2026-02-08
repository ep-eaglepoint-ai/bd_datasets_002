package aggregator

import (
	"context"
	"sync"
	"time"
)

// ProcessBatch processes multiple batches of data sources concurrently.
func ProcessBatch(ctx context.Context, batches [][]DataSource) ([]AggregatedResult, error) {
	// Handle edge case: empty batch list
	if len(batches) == 0 {
		return make([]AggregatedResult, 0), nil
	}

	// Check if context is already cancelled
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	// Create buffered channels sized to number of batches to prevent blocking
	resultChan := make(chan AggregatedResult, len(batches))
	errChan := make(chan error, len(batches))

	var wg sync.WaitGroup

	// Spawn goroutines for each batch with context support
	for _, batch := range batches {
		wg.Add(1)
		go func(b []DataSource) {
			defer wg.Done()

			// Check context before starting work
			select {
			case <-ctx.Done():
				return
			default:
			}

			result, err := FetchAndAggregate(ctx, b, 5*time.Second)
			if err != nil {
				// Use select to allow cancellation during send
				select {
				case errChan <- err:
				case <-ctx.Done():
					// Context cancelled, exit without blocking
					return
				}
				return
			}

			// Use select to allow cancellation during send
			select {
			case resultChan <- *result:
			case <-ctx.Done():
				// Context cancelled, exit without blocking
				return
			}
		}(batch)
	}

	// Close channels after all goroutines complete
	// This goroutine will finish even if we return early due to context cancellation
	go func() {
		wg.Wait()
		close(resultChan)
		close(errChan)
	}()

	results := make([]AggregatedResult, 0)
	var firstErr error
	received := 0

	// Collect results from all batches
	for received < len(batches) {
		select {
		case result, ok := <-resultChan:
			if !ok {
				// Channel closed - continue reading from errChan until we have all items
				// or until errChan also closes
				continue
			}
			results = append(results, result)
			received++
		case err, ok := <-errChan:
			if !ok {
				// Channel closed - continue reading from resultChan until we have all items
				// or until resultChan also closes
				continue
			}
			if firstErr == nil {
				firstErr = err
			}
			received++
		case <-ctx.Done():
			// Context cancelled, return partial results
			// Workers will exit when they check context
			// Buffered channels will accept any pending sends
			return results, ctx.Err()
		}
	}

	return results, firstErr
}
