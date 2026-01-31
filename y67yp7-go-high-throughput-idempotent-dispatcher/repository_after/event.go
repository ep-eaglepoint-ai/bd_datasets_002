package dispatcher

import (
	"time"
)

// EventState represents the current state of an event in the dispatcher
type EventState string

const (
	// StatePending - Event is queued but not yet being processed
	StatePending EventState = "PENDING"
	// StateInFlight - Event is currently being dispatched
	StateInFlight EventState = "IN_FLIGHT"
	// StateRetryWait - Event is waiting for retry after a failed attempt
	StateRetryWait EventState = "RETRY_WAIT"
	// StateFailed - Event has permanently failed (Dead Letter)
	StateFailed EventState = "FAILED"
	// StateCompleted - Event has been successfully acknowledged
	StateCompleted EventState = "COMPLETED"
)

// Event represents a dispatchable event with ordering guarantees
type Event struct {
	// EventID is the unique idempotency key for this event
	EventID string `json:"event_id"`
	// EntityID is used for causal ordering - events with same EntityID are ordered
	EntityID string `json:"entity_id"`
	// SequenceNumber enforces ordering within an EntityID
	SequenceNumber int64 `json:"sequence_number"`
	// Payload is the data to be delivered
	Payload []byte `json:"payload"`
	// TargetURL is the destination webhook endpoint
	TargetURL string `json:"target_url"`
	// State is the current state in the state machine
	State EventState `json:"state"`
	// RetryCount tracks the number of delivery attempts
	RetryCount int `json:"retry_count"`
	// LastAttempt is the timestamp of the last delivery attempt
	LastAttempt time.Time `json:"last_attempt"`
	// NextRetryAt is the scheduled time for the next retry
	NextRetryAt time.Time `json:"next_retry_at"`
	// ErrorMessage stores the last error encountered
	ErrorMessage string `json:"error_message,omitempty"`
	// CreatedAt is when the event was first created
	CreatedAt time.Time `json:"created_at"`
}

// NewEvent creates a new event in the PENDING state
func NewEvent(eventID, entityID string, sequenceNumber int64, payload []byte, targetURL string) *Event {
	return &Event{
		EventID:        eventID,
		EntityID:       entityID,
		SequenceNumber: sequenceNumber,
		Payload:        payload,
		TargetURL:      targetURL,
		State:          StatePending,
		RetryCount:     0,
		CreatedAt:      time.Now(),
	}
}

// CanTransitionTo validates if the state transition is allowed
func (e *Event) CanTransitionTo(newState EventState) bool {
	switch e.State {
	case StatePending:
		return newState == StateInFlight
	case StateInFlight:
		return newState == StateCompleted || newState == StateRetryWait || newState == StateFailed
	case StateRetryWait:
		return newState == StateInFlight
	case StateFailed, StateCompleted:
		return false // Terminal states
	}
	return false
}

// TransitionTo attempts to transition the event to a new state
func (e *Event) TransitionTo(newState EventState) bool {
	if !e.CanTransitionTo(newState) {
		return false
	}
	e.State = newState
	return true
}

// IsTerminal returns true if the event is in a terminal state
func (e *Event) IsTerminal() bool {
	return e.State == StateFailed || e.State == StateCompleted
}

// IsBlocking returns true if this event should block subsequent events for the same entity
func (e *Event) IsBlocking() bool {
	return e.State == StateFailed
}

// MarkInFlight transitions the event to IN_FLIGHT state
func (e *Event) MarkInFlight() bool {
	if e.TransitionTo(StateInFlight) {
		e.LastAttempt = time.Now()
		return true
	}
	return false
}

// MarkCompleted transitions the event to COMPLETED state
func (e *Event) MarkCompleted() bool {
	return e.TransitionTo(StateCompleted)
}

// MarkRetryWait transitions the event to RETRY_WAIT state with next retry time
func (e *Event) MarkRetryWait(nextRetryAt time.Time, errorMsg string) bool {
	if e.TransitionTo(StateRetryWait) {
		e.RetryCount++
		e.NextRetryAt = nextRetryAt
		e.ErrorMessage = errorMsg
		return true
	}
	return false
}

// MarkFailed transitions the event to FAILED (Dead Letter) state
func (e *Event) MarkFailed(errorMsg string) bool {
	if e.TransitionTo(StateFailed) {
		e.ErrorMessage = errorMsg
		return true
	}
	return false
}
