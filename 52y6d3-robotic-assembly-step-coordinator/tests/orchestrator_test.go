package tests

import (
	"testing"
	"sync"
	
	"robotic-assembly"
)

// Req #2: State Management Logic
// Verify that Register, Complete, and Fail actions move tasks through the correct states.
func TestStateManagement(t *testing.T) {
	orch := orchestrator.NewTaskOrchestrator()

	// 1. Register
	err := orch.RegisterTask("task1", "")
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}
	s, _ := orch.GetTaskStatus("task1")
	if s != orchestrator.StatusReady {
		t.Errorf("Expected Ready, got %s", s)
	}

	// 2. Complete
	err = orch.CompleteTask("task1")
	if err != nil {
		t.Fatalf("Complete failed: %v", err)
	}
	s, _ = orch.GetTaskStatus("task1")
	if s != orchestrator.StatusCompleted {
		t.Errorf("Expected Completed, got %s", s)
	}

	// 3. Fail (on a new task)
	orch.RegisterTask("task2", "")
	err = orch.FailTask("task2")
	if err != nil {
		t.Fatalf("Fail failed: %v", err)
	}
	s, _ = orch.GetTaskStatus("task2")
	if s != orchestrator.StatusFailed {
		t.Errorf("Expected Failed, got %s", s)
	}
}

// Req #1, #3, #7: Prerequisite Mapping, Buffer & Release, Out of Order Test
func TestOutOfOrderRegistration(t *testing.T) {
	orch := orchestrator.NewTaskOrchestrator()

	// Register Child (Task 2) depending on Parent (Task 1)
	err := orch.RegisterTask("task2", "task1")
	if err != nil {
		t.Fatalf("Failed to register task2: %v", err)
	}

	// Verify Task 2 is Pending (Waiting Room)
	status, _ := orch.GetTaskStatus("task2")
	if status != orchestrator.StatusPending {
		t.Errorf("Expected task2 to be Pending, got %s", status)
	}

	// Register Parent (Task 1)
	orch.RegisterTask("task1", "")

	// Task 2 should STILL be Pending because Task 1 is not yet Completed
	status, _ = orch.GetTaskStatus("task2")
	if status != orchestrator.StatusPending {
		t.Errorf("Expected task2 to stay Pending, got %s", status)
	}

	// Complete Task 1
	orch.CompleteTask("task1")

	// Verify Task 2 is now Ready (Released)
	status, _ = orch.GetTaskStatus("task2")
	if status != orchestrator.StatusReady {
		t.Errorf("Expected task2 to be Ready, got %s", status)
	}
}

// Req #4, #8: Cascading Cancellation & Failure Logic
func TestFailureCascade(t *testing.T) {
	orch := orchestrator.NewTaskOrchestrator()

	// Chain: A -> B -> C
	orch.RegisterTask("A", "")
	orch.RegisterTask("B", "A") 
	orch.RegisterTask("C", "B") 

	// Fail A
	orch.FailTask("A")

	// Verify B and C are Cancelled
	statusB, _ := orch.GetTaskStatus("B")
	statusC, _ := orch.GetTaskStatus("C")
	
	if statusB != orchestrator.StatusCancelled || statusC != orchestrator.StatusCancelled {
		t.Errorf("Fail to cascade cancellation. B: %s, C: %s", statusB, statusC)
	}
}

// Req #5: Basic Validation & Safety (Self-referential)
func TestSelfReferentialCheck(t *testing.T) {
	orch := orchestrator.NewTaskOrchestrator()
	err := orch.RegisterTask("A", "A")
	if err == nil {
		t.Error("Expected error for self-referential dependency")
	}
}

// Req #6: Concurrency Protection
func TestConcurrency(t *testing.T) {
	orch := orchestrator.NewTaskOrchestrator()
	var wg sync.WaitGroup

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			id := string(rune('A' + i))
			orch.RegisterTask(id, "")
		}(i)
	}
	wg.Wait()

	for i := 0; i < 100; i++ {
		id := string(rune('A' + i))
		_, err := orch.GetTaskStatus(id)
		if err != nil {
			t.Errorf("Task %s lost", id)
		}
	}
}
