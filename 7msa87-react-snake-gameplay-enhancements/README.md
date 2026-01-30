# 7MSA87 - React Snake Gameplay Enhancements

**Category:** sft

## Overview
- Task ID: 7MSA87
- Title: React Snake Gameplay Enhancements
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 7msa87-react-snake-gameplay-enhancements

## Requirements
- The game must detect when the snake’s head collides with its own body and immediately end the game with a distinct error message.
- Existing wall collision behavior must remain unchanged and continue to end the game reliably when boundaries are hit.
- The game must support pausing and resuming via keyboard input, fully freezing and restoring gameplay state without resets.
- The highest score achieved must be stored in localStorage, loaded on startup, and displayed during gameplay.
- Snake movement speed must increase based on score milestones, applying changes immediately and safely during gameplay.
- The snake must be prevented from instantly reversing direction, using actual movement direction rather than raw key input.
- All movement intervals must be properly created, cleared, and restarted to avoid memory leaks or duplicated timers.
- The game must handle rapid and repeated key presses without causing invalid state transitions or crashes.
- Game state must remain consistent across start, pause, resume, game-over, and restart transitions.
- The implementation must preserve the existing grid system, food spawn rules, and core mechanics without introducing external dependencies.

## Metadata
- Programming Languages: JavaScript
- Frameworks: React
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
