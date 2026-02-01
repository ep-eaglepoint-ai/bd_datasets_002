package dwrg

import (
	"context"
	"errors"
)

// AtomicStorage defines the interface for the distributed persistence layer.
// This interface allows the governor to maintain consistency across nodes.
//
// Implementations should provide atomic operations suitable for distributed
// environments such as Redis, etcd, or DynamoDB.
type AtomicStorage interface {
	// Get retrieves the current value associated with the key.
	// Returns the value and true if found, or 0 and false if not found.
	Get(ctx context.Context, key string) (int64, bool, error)

	// CompareAndSwap atomically updates the value for key to 'new' if current value matches 'old'.
	// Returns true if the swap was successful, false otherwise.
	// If the key does not exist, old should be 0.
	CompareAndSwap(ctx context.Context, key string, old, new int64) (bool, error)

	// AtomicIncrement atomically increments the value by delta and returns the new value.
	// If the key does not exist, it is created with the delta value.
	AtomicIncrement(ctx context.Context, key string, delta int64) (int64, error)
}

var (
	// ErrStorageUnavailable indicates the storage layer is not reachable.
	ErrStorageUnavailable = errors.New("storage unavailable")
)
