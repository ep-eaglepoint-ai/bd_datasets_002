package aggregator

import (
	"context"
)

// StreamResults streams results from multiple sources to the provided channel.
// This is a fire-and-forget operation 
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
	// The select with context.Done() prevents blocking forever if receiver stops consuming
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
			// When context is cancelled (as in the test), workers will exit
			select {
			case out <- Result{
				SourceID: s.ID,
				Data:     data,
				Error:    err,
			}:
				// Successfully sent
			case <-ctx.Done():
				// Context cancelled, exit without blocking
				return
			}
		}(source)
	}

	// Return immediately (fire-and-forget behavior)
	return nil
}
