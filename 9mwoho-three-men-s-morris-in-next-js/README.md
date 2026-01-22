# 9MWOHO - Three Men’s Morris in Next.js

**Category:** sft

## Overview
- Task ID: 9MWOHO
- Title: Three Men’s Morris in Next.js
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 9mwoho-three-men-s-morris-in-next-js

## Requirements
- The application must implement a complete digital version of the Three Men’s Morris board game, allowing two players to alternate turns on a 3×3 board while enforcing correct turn order, preventing invalid actions, and clearly indicating the active player, current phase, and game status at all times.
- The system must support two distinct gameplay phases: a placement phase, where each player places exactly three pieces on empty board positions, and a movement phase, where players move one of their existing pieces per turn to a legally adjacent empty position, automatically transitioning between phases only when all placement conditions are satisfied.
- The game engine must strictly validate all moves, preventing placement on occupied cells, movement to non-adjacent positions, movement of the opponent’s pieces, moves after the game has ended, and any action that violates the current phase rules, while providing immediate and clear feedback to the user.
- The application must detect winning conditions in real time by evaluating all valid alignment patterns (horizontal, vertical, and optional diagonal), immediately declaring a winner once three pieces are aligned and preventing further interaction until the game is reset.
- The system must support configurable rule variants, including optional diagonal movement and diagonal win conditions, allowing these options to be toggled before or during gameplay while safely resetting or adapting game state as needed.
- The user interface must visually represent the board, pieces, selected elements, and legal move hints, ensuring accessibility, responsiveness across screen sizes, and clarity even for first-time users, including scenarios where no valid moves are available or a stalemate-like position occurs
- The application must provide full game lifecycle controls, including reset and replay functionality, ensuring all state (board, phase, turn, selection, and status messages) is correctly reinitialized without residual data from previous games.
- All game state must be managed locally within the application using predictable, immutable state updates, ensuring consistency after rapid interactions, accidental double clicks, or interrupted user actions, and preventing desynchronization between UI and logic.
- The system must be robust against edge cases such as repeated selections, rapid turn switching, simultaneous win detection attempts, and invalid rule toggling mid-move, guaranteeing stable behavior under all user interaction patterns.

## Metadata
- Programming Languages: TypeScript
- Frameworks: Next js
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
