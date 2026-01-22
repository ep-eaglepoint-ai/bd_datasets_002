package aggregator

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

type DataSource struct {
	ID   string
	URL  string
}

type Result struct {
	SourceID string
	Data     []byte
	Error    error
}

type AggregatedResult struct {
	Results []Result
	Errors  []error
}

func fetchFromSource(source DataSource) ([]byte, error) {
	time.Sleep(100 * time.Millisecond)
	if source.ID == "source_3" {
		return nil, errors.New("connection timeout")
	}
	return []byte(fmt.Sprintf("data from %s", source.ID)), nil
}

func FetchAndAggregate(ctx context.Context, sources []DataSource, timeout time.Duration) (*AggregatedResult, error) {
	// Handle edge case: empty source list
	if len(sources) == 0 {
		return &AggregatedResult{
			Results: make([]Result, 0),
			Errors:  make([]error, 0),
		}, nil
	}

	// Check if context is already cancelled
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	// Create buffered channel sized to number of sources to prevent blocking
	resultChan := make(chan Result, len(sources))
	
	var wg sync.WaitGroup
	
	// Create a cancellable context for workers
	workerCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	
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
		case result, ok := <-resultChan:
			if !ok {
				// Channel closed, all workers completed
				return aggregated, nil
			}
			if result.Error != nil {
				aggregated.Errors = append(aggregated.Errors, result.Error)
			} else {
				aggregated.Results = append(aggregated.Results, result)
			}
		case <-timeoutTimer.C:
			// Timeout occurred, cancel all workers and return
			cancel()
			return aggregated, errors.New("aggregation timeout")
		case <-ctx.Done():
			// Parent context cancelled, cancel workers and return
			cancel()
			return aggregated, ctx.Err()
		}
	}
}

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
	go func() {
		wg.Wait()
		close(resultChan)
		close(errChan)
	}()
	
	results := make([]AggregatedResult, 0)
	var firstErr error
	
	// Collect results from all batches
	for i := 0; i < len(batches); i++ {
		select {
		case result, ok := <-resultChan:
			if ok {
				results = append(results, result)
			}
		case err, ok := <-errChan:
			if ok && firstErr == nil {
				firstErr = err
			}
		case <-ctx.Done():
			// Context cancelled, return partial results
			return results, ctx.Err()
		}
	}
	
	return results, firstErr
}

func StreamResults(ctx context.Context, sources []DataSource, out chan<- Result) error {
	// Handle edge case: empty source list
	if len(sources) == 0 {
		return nil
	}

	// Check if context is already cancelled
	if ctx.Err() != nil {
		return ctx.Err()
	}

	// Spawn fire-and-forget goroutines with context cancellation support
	// Use select with default case or buffered channel to prevent blocking
	// Since we don't know channel capacity, use select with context and default
	for _, source := range sources {
		go func(s DataSource) {
			// Check for cancellation before starting work
			select {
			case <-ctx.Done():
				return
			default:
			}
			
			data, err := fetchFromSource(s)
			
			// Use select to allow cancellation during send
			// This prevents blocking forever if receiver stops consuming
			select {
			case out <- Result{
				SourceID: s.ID,
				Data:     data,
				Error:    err,
			}:
			case <-ctx.Done():
				// Context cancelled, exit without blocking
				return
			}
		}(source)
	}
	
	// Return immediately (fire-and-forget behavior)
	return nil
}
