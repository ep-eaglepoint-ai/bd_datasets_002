package dispatcher

import (
	"context"
	"sort"
	"sync"
	"time"
)

// MemoryStore is a thread-safe in-memory implementation of PersistentStore
// Used primarily for testing, but demonstrates the interface contract
type MemoryStore struct {
	mu     sync.RWMutex
	events map[string]*Event // eventID -> Event
}

// NewMemoryStore creates a new in-memory store
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		events: make(map[string]*Event),
	}
}

// GetEvent retrieves an event by its EventID
func (m *MemoryStore) GetEvent(ctx context.Context, eventID string) (*Event, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	event, ok := m.events[eventID]
	if !ok {
		return nil, ErrEventNotFound
	}
	// Return a copy to prevent external mutation
	eventCopy := *event
	return &eventCopy, nil
}

// SaveEvent persists an event (insert or update)
func (m *MemoryStore) SaveEvent(ctx context.Context, event *Event) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Store a copy to prevent external mutation
	eventCopy := *event
	m.events[event.EventID] = &eventCopy
	return nil
}

// GetLastCompletedSequence returns the highest completed sequence number for an entity
func (m *MemoryStore) GetLastCompletedSequence(ctx context.Context, entityID string) (int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var maxSeq int64 = 0
	for _, event := range m.events {
		if event.EntityID == entityID && event.State == StateCompleted {
			if event.SequenceNumber > maxSeq {
				maxSeq = event.SequenceNumber
			}
		}
	}
	return maxSeq, nil
}

// GetEventsForEntity returns all events for an entity, ordered by sequence number
func (m *MemoryStore) GetEventsForEntity(ctx context.Context, entityID string) ([]*Event, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var events []*Event
	for _, event := range m.events {
		if event.EntityID == entityID {
			eventCopy := *event
			events = append(events, &eventCopy)
		}
	}

	// Sort by sequence number
	sort.Slice(events, func(i, j int) bool {
		return events[i].SequenceNumber < events[j].SequenceNumber
	})

	return events, nil
}

// GetPendingEvents returns all events ready for processing
func (m *MemoryStore) GetPendingEvents(ctx context.Context) ([]*Event, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	now := time.Now()
	var events []*Event
	for _, event := range m.events {
		if event.State == StatePending {
			eventCopy := *event
			events = append(events, &eventCopy)
		} else if event.State == StateRetryWait && now.After(event.NextRetryAt) {
			eventCopy := *event
			events = append(events, &eventCopy)
		}
	}

	// Sort by sequence number for deterministic processing
	sort.Slice(events, func(i, j int) bool {
		if events[i].EntityID != events[j].EntityID {
			return events[i].EntityID < events[j].EntityID
		}
		return events[i].SequenceNumber < events[j].SequenceNumber
	})

	return events, nil
}

// GetBlockedEntities returns entity IDs that have a FAILED event
func (m *MemoryStore) GetBlockedEntities(ctx context.Context) ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	blockedSet := make(map[string]bool)
	for _, event := range m.events {
		if event.State == StateFailed {
			blockedSet[event.EntityID] = true
		}
	}

	blocked := make([]string, 0, len(blockedSet))
	for entityID := range blockedSet {
		blocked = append(blocked, entityID)
	}
	return blocked, nil
}

// IsEntityBlocked checks if an entity has any FAILED events
func (m *MemoryStore) IsEntityBlocked(ctx context.Context, entityID string) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, event := range m.events {
		if event.EntityID == entityID && event.State == StateFailed {
			return true, nil
		}
	}
	return false, nil
}

// GetNextSequenceEvent gets the next event in sequence for an entity that's ready to process
func (m *MemoryStore) GetNextSequenceEvent(ctx context.Context, entityID string) (*Event, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// First, find the last completed sequence
	var lastCompleted int64 = 0
	for _, event := range m.events {
		if event.EntityID == entityID && event.State == StateCompleted {
			if event.SequenceNumber > lastCompleted {
				lastCompleted = event.SequenceNumber
			}
		}
	}

	// Check for any in-flight events that would block
	for _, event := range m.events {
		if event.EntityID == entityID && event.State == StateInFlight {
			return nil, nil // Another event is in flight, wait
		}
	}

	// Check for any failed events that would block
	for _, event := range m.events {
		if event.EntityID == entityID && event.State == StateFailed {
			return nil, nil // Entity is blocked due to failure
		}
	}

	// Find the next event in sequence
	nextSeq := lastCompleted + 1
	now := time.Now()
	for _, event := range m.events {
		if event.EntityID == entityID && event.SequenceNumber == nextSeq {
			if event.State == StatePending ||
				(event.State == StateRetryWait && now.After(event.NextRetryAt)) {
				eventCopy := *event
				return &eventCopy, nil
			}
		}
	}

	return nil, nil
}
