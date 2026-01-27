# 5IFPNJ - Multi-Agent Pathfinding with Space-Time Reservations

**Category:** sft

## Overview
- Task ID: 5IFPNJ
- Title: Multi-Agent Pathfinding with Space-Time Reservations
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5ifpnj-multi-agent-pathfinding-with-space-time-reservations

## Requirements
- The reservation check must include the Time Step (           t        ). A global map of "Occupied Cells" that ignores time (treating robots as static walls) is a logic failure.
- The A* neighbor expansion must include the option to remain in the current cell ({x, y, t+1}) if movement is blocked.
- The code must explicitly check for the swapping scenario: if Robot A moves           1→21→2          and Robot B moves           2→12→1          at the same tick, it must be flagged as a collision
- The Open Set for the A* algorithm must use container/heap. Using a slice and sorting it every iteration (           O(Nlog⁡N)O(NlogN)          ) is a performance failure.
- The path calculation and the reservation of that path in the table must be atomic or synchronized. If the path is returned without marking the table, subsequent robots will crash.
- The system must use Manhattan Distance (or similar) calculated against the target coordinates
- The A* nodes must track (x, y, time). Tracking only (x, y) prevents solving dynamic conflicts.
- Access to the ReservationTable must be protected by a Mutex (sync.RWMutex).

## Metadata
- Programming Languages: Go (Golang 1.18+)
- Frameworks: (none)
- Libraries: (none)
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
