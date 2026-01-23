# 9U6ZUO - AI Maze Solver Test Suite

**Category:** sft

## Overview
- Task ID: 9U6ZUO
- Title: AI Maze Solver Test Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 9u6zuo-ai-maze-solver-test-suite

## Requirements
- Test that maze generation creates valid mazes (start at (1,1) and goal at (GRID_SIZE, GRID_SIZE) are always passable)
- Test that maze boundaries are always walls
- Test that BFS finds a path when a path exists
- Test that DFS finds a path when a path exists
- Test that A* finds a path when a path exists
- Test that algorithms handle unsolvable mazes correctly (return empty path, not infinite loops)
- Test that returned paths contain valid consecutive neighbors (each step must be adjacent to the previous step)
- Test that path cells are all passable (not walls)
- Test that path starts at player position and ends at goal position
- Test that player can move in all four directions when cells are passable
- Test that player cannot move into walls
- Test that player cannot move out of bounds
- Test that reaching goal sets gameWon state to true
- Test that movement is disabled when gameWon is true
- Test that player position is always within bounds
- Test that goal position is always within bounds
- Test complete game flow: generate maze → player moves → reach goal → game won
- Test that switching AI algorithms works correctly
- Use Jest as the testing framework

## Metadata
- Programming Languages: JavaScript, TypeScript
- Frameworks: Jest
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
