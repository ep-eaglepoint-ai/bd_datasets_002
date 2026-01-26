package dwrg

import (
	"context"
	"errors"
)

// AtomicStorage defines the interface for the distributed persistence layer.
// This interface allows the governor to maintain consistency across nodes.
type AtomicStorage interface {
	// Get retrieves the current value associated with the key.
	// Returns the value and true if found, or 0 and false if not found.
	// Returns an error if the storage backend fails.
	Get(ctx context.Context, key string) (int64, bool, error)

	// CompareAndSwap atomically updates the value for key to 'new' if the current value matches 'old'.
	// Returns true if the swap was successful, false otherwise.
	// If the key does not exist, old should be 0 (or a specific sentinel for non-existence).
	CompareAndSwap(ctx context.Context, key string, old, new int64) (bool, error)
}

var (
	// ErrStorageUnavailable indicates the storage layer is not reachable.
	ErrStorageUnavailable = errors.New("storage unavailable")
)
