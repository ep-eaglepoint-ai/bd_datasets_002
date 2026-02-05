package orchestrator

import (
	"errors"
	"fmt"
	"sync"
)

// TaskStatus represents the current state of a task.
type TaskStatus string

const (
	StatusPending   TaskStatus = "Pending"
	StatusReady     TaskStatus = "Ready"
	StatusCompleted TaskStatus = "Completed"
	StatusFailed    TaskStatus = "Failed"
	StatusCancelled TaskStatus = "Cancelled"
)

// Task represents a unit of work with potential dependencies.
type Task struct {
	ID       string
	Status   TaskStatus
	WaitOnID string // ID of the task this task depends on (optional)
}

// TaskOrchestrator manages task dependencies and lifecycle.
type TaskOrchestrator struct {
	tasks       map[string]*Task
	waitingDeps map[string][]*Task // ParentID -> List of tasks waiting for it
	mu          sync.RWMutex
}

// NewTaskOrchestrator creates a new orchestrator instance.
func NewTaskOrchestrator() *TaskOrchestrator {
	return &TaskOrchestrator{
		tasks:       make(map[string]*Task),
		waitingDeps: make(map[string][]*Task),
	}
}

// RegisterTask adds a new task to the system.
// Req #2: RegisterTask action.
// Req #5: Basic Validation (No self-referential dependencies).
// Req #6: Concurrency Protection.
func (o *TaskOrchestrator) RegisterTask(id string, waitOnID string) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	if _, exists := o.tasks[id]; exists {
		return fmt.Errorf("task with ID %s already exists", id)
	}

	if id == waitOnID {
		return errors.New("self-referential dependency detected")
	}

	newTask := &Task{
		ID:       id,
		WaitOnID: waitOnID,
		Status:   StatusPending,
	}

	// Logic for determining initial status based on dependency
	if waitOnID == "" {
		newTask.Status = StatusReady
	} else {
		// Check parent status if it exists
		parentTask, parentExists := o.tasks[waitOnID]
		if parentExists {
			switch parentTask.Status {
			case StatusCompleted:
				newTask.Status = StatusReady
			case StatusFailed, StatusCancelled:
				newTask.Status = StatusCancelled
			default:
				// Pending or Ready, so this task must wait
				// Req #1: Prerequisite Mapping
				o.waitingDeps[waitOnID] = append(o.waitingDeps[waitOnID], newTask)
			}
		} else {
			// Parent not yet registered, so we wait (Req #7 logic: Out of order)
			o.waitingDeps[waitOnID] = append(o.waitingDeps[waitOnID], newTask)
		}
	}

	o.tasks[id] = newTask
	return nil
}

// CompleteTask marks a task as successful and unblocks dependents.
// Req #2: CompleteTask action.
// Req #3: Buffer & Release.
func (o *TaskOrchestrator) CompleteTask(id string) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	task, exists := o.tasks[id]
	if !exists {
		return fmt.Errorf("task %s not found", id)
	}

	if task.Status == StatusFailed || task.Status == StatusCancelled {
		return fmt.Errorf("cannot complete task %s from status %s", id, task.Status)
	}

	task.Status = StatusCompleted

	// Release waiting children
	if children, ok := o.waitingDeps[id]; ok {
		for _, child := range children {
			// Only promote if it hasn't been cancelled/failed by other means (double check)
			if child.Status == StatusPending {
				child.Status = StatusReady
			}
		}
		// Clean up dependency entry as they are processed
		delete(o.waitingDeps, id)
	}

	return nil
}

// FailTask marks a task as failed and cancels downstream dependents.
// Req #2: FailTask action.
// Req #4: Cascading Cancellation.
func (o *TaskOrchestrator) FailTask(id string) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	task, exists := o.tasks[id]
	if !exists {
		return fmt.Errorf("task %s not found", id)
	}

	// If already in a terminal state, strictly speaking we might want to error or just no-op.
	// We'll proceed to ensure cascade happens if not already triggered.
	task.Status = StatusFailed

	// Trigger cascading cancellation
	o.cascadeCancellation(id)

	return nil
}

// cascadeCancellation recursively cancels tasks waiting on the given parent ID.
// This handles the "Failure Wave".
func (o *TaskOrchestrator) cascadeCancellation(parentID string) {
	children, ok := o.waitingDeps[parentID]
	if !ok {
		return
	}

	for _, child := range children {
		if child.Status != StatusCancelled && child.Status != StatusFailed {
			child.Status = StatusCancelled
			// Recurse for this child, as it is now cancelled
			o.cascadeCancellation(child.ID)
		}
	}
	// Clear the waiting deps strictly? Or keep them to show history?
	// Req says "set to CANCELLED". We can clean up the map to prevent leaks.
	delete(o.waitingDeps, parentID)
}

// GetTaskStatus helper for testing/inspection
func (o *TaskOrchestrator) GetTaskStatus(id string) (TaskStatus, error) {
	o.mu.RLock()
	defer o.mu.RUnlock()
	
	task, exists := o.tasks[id]
	if !exists {
		return "", fmt.Errorf("task not found")
	}
	return task.Status, nil
}
