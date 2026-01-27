# 11YV40 - Destination Dispatch Elevator System 

**Category:** sft

## Overview
- Task ID: 11YV40
- Title: Destination Dispatch Elevator System 
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 11yv40-destination-dispatch-elevator-system

## Requirements
- A car moving UP must not service a DOWN request until it has serviced all its UP requests (or becomes idle).
- The logic must track currentLoad. If currentLoad >= maxCapacity, the allocation logic must return a high cost (infinity) for that car, preventing assignment.
- Thread Safety: The global Controller state (holding positions of all cars) must be protected by sync.RWMutex.
- he RequestRide function must return a Car ID immediately (O(1) or O(N_cars)). It cannot wait for the elevator to actually arrive.
- The assignment logic must demonstrate a heuristic (e.g., distance + stops * penalty). Random assignment or Round-Robin is a failure.
- Each elevator must have a mechanism (Wait/Sleep or Ticker) to simulate travel time between floors. Teleporting (changing floor 1 to 50 in 0ms) is a failure.
- The simulation must include a "Door Dwell" time. Cars cannot move while doors are open.
- If a request is made for Floor X while the car is already at Floor X with doors open, it should accommodate the passenger without a movement cycle.
- nputting invalid floors (e.g., -1 or > MaxFloor) must be handled gracefully.

## Metadata
- Programming Languages: Go (Golang 1.18+)
- Frameworks: (none)
- Libraries: sync, time, container/heap (optional).
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
