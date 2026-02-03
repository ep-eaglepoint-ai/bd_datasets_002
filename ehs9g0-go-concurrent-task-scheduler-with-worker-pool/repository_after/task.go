package scheduler

import (
	"context"
	"time"
)

// Priority levels for tasks - High=0 (highest), Medium=1, Low=2 (lowest)
type Priority int

const (
	PriorityHigh   Priority = 0
	PriorityMedium Priority = 1
	PriorityLow    Priority = 2
)

// TaskState represents the current state of a task
type TaskState int

const (
	TaskStatePending TaskState = iota
	TaskStateRunning
	TaskStateCompleted
	TaskStateFailed
	TaskStateRetrying
	TaskStateCancelled
)

// Task represents a unit of work to be executed
type Task struct {
	ID          string
	Type        string
	Priority    Priority
	Payload     interface{}
	MaxRetries  int
	Timeout     time.Duration
	CreatedAt   time.Time
	ExecuteFunc func(ctx context.Context, progress chan<- int) error
}

// TaskResult contains the outcome of task execution
type TaskResult struct {
	TaskID      string
	State       TaskState
	Success     bool
	Error       error
	StartedAt   time.Time
	CompletedAt time.Time
	Duration    time.Duration
	Retries     int
}

// Stats holds scheduler statistics
type Stats struct {
	Submitted   int64
	Running     int64
	Completed   int64
	Failed      int64
	Retrying    int64
	QueueLength int64
}