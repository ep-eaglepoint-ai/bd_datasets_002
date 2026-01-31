# 52Y6D3 - robotic-Assembly-Step-Coordinator

**Category:** sft

## Overview
- Task ID: 52Y6D3
- Title: robotic-Assembly-Step-Coordinator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 52y6d3-robotic-assembly-step-coordinator

## Requirements
- Prerequisite Mapping: Implement a system to track dependencies where each 'parent' task ID is mapped to a list of its 'child' tasks. When a parent task is updated, the coordinator must efficiently look up and notify all its direct children.
- State Management Logic: Define three specific actions for the coordinator: `RegisterTask` (adds a new task to the system), `CompleteTask` (marks a task as successful), and `FailTask` (marks a task as failed and halts its dependents).
- Buffer & Release: Create a logic where tasks with unfinished Prerequisites are held in an internal collection. As soon as `CompleteTask` is called for a specific ID, all of its direct waiting children must transition to a state that permits their execution.
- Cascading Cancellation: Ensure that when `FailTask` is called, all child tasks currently waiting for that specific ID in the buffer are set to 'CANCELLED'. This prevents the robot from attempting a task whose prerequisite step never successfully finished.
- Basic Validation & Safety: Check for self-referential dependencies (a task waiting on its own ID) during registration. The system must reject these inputs to avoid permanent 'Wait' states.
- Concurrency Protection: Use a `sync.Mutex` or `sync.RWMutex` to wrap all operations involving the internal task maps. This ensures that the system can handle updates from multiple asynchronous workers without causing data races.
- Testing Requirement (Out of Order): Write a test where Task #2 (depends on #1) is registered before Task #1. Verify that Task #2 remains in a 'Waiting' state until Task #1 is registered and then completed.
- Testing Requirement (Failure Logic): Implement a test where a task fails; verify that all of its dependent tasks in the waiting buffer are successfully updated to the 'CANCELLED' status.

## Metadata
- Programming Languages: Go
- Tools: Docker

## Docker Commands

### 1. BEFORE TEST COMMAND
Commands to spin up the app and run tests on `repository_before`. Since it's empty, this will fail.
```bash
docker compose run --rm app sh -c "echo 'Running tests on repository_before...' && exit 1"
```

### 2. AFTER TEST COMMAND
Commands to run tests on `repository_after`.
```bash
docker compose up --build
```

### 3. TEST & REPORT COMMAND
Commands to run evaluation and generate reports.
```bash
docker compose run --rm app go run evaluation/evaluation.go
```

## Structure
- repository_before/: baseline code (empty)
- repository_after/: optimized code (Task Orchestrator implementation)
- tests/: Go test suite
- evaluation/: evaluation/evaluation.go and reports/
- patches/: patches for diffing
- trajectory/: Engineering Trajectory roadmap
