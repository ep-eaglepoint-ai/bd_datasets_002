package dispatcher

import (
	"context"
	"errors"
)

// Common errors for the store
var (
	ErrEventNotFound  = errors.New("event not found")
	ErrEntityNotFound = errors.New("entity not found")
)

// PersistentStore defines the interface for event persistence
// This abstraction allows for different storage backends (memory, SQL, Redis, etc.)
type PersistentStore interface {
	// GetEvent retrieves an event by its EventID
	GetEvent(ctx context.Context, eventID string) (*Event, error)

	// SaveEvent persists an event (insert or update)
	SaveEvent(ctx context.Context, event *Event) error

	// GetLastCompletedSequence returns the highest completed sequence number for an entity
	// Returns 0 if no events have been completed for this entity
	GetLastCompletedSequence(ctx context.Context, entityID string) (int64, error)

	// GetEventsForEntity returns all events for an entity, ordered by sequence number
	GetEventsForEntity(ctx context.Context, entityID string) ([]*Event, error)

	// GetPendingEvents returns all events in PENDING or RETRY_WAIT state that are ready for processing
	GetPendingEvents(ctx context.Context) ([]*Event, error)

	// GetBlockedEntities returns entity IDs that have a FAILED event blocking subsequent events
	GetBlockedEntities(ctx context.Context) ([]string, error)

	// IsEntityBlocked checks if an entity has any FAILED events blocking it
	IsEntityBlocked(ctx context.Context, entityID string) (bool, error)

	// GetNextSequenceEvent gets the next event in sequence for an entity that's ready to process
	GetNextSequenceEvent(ctx context.Context, entityID string) (*Event, error)
}
