# 5NA9E6 - React Dino Endless Runner Game Test Suite

**Category:** sft

## Overview
- Task ID: 5NA9E6
- Title: React Dino Endless Runner Game Test Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5na9e6-react-dino-endless-runner-game-test-suite

## Requirements
- The test suite must verify that the game initializes in the idle state on component mount.
- The test suite must validate that pressing Space or ArrowUp transitions the game from idle to running.
- The test suite must confirm that a jump is triggered only when the dino is grounded.
- The test suite must verify that gravity is applied to the dino’s vertical velocity on every animation frame.
- The test suite must ensure that double-jumping is prevented while the dino is airborne.
- The test suite must validate that the dino lands exactly at ground level and resets its jump state.
- The test suite must confirm that requestAnimationFrame is used to drive the game loop.
- The test suite must verify that the game loop stops immediately when the game state becomes gameOver.
- The test suite must validate that obstacles spawn at randomized intervals within defined limits.
- The test suite must ensure that obstacles move left consistently and are removed once off-screen.
- The test suite must verify that bounding-box collision detection correctly identifies overlaps.
- The test suite must confirm that a detected collision transitions the game state to gameOver.
- The test suite must validate that score increases over time and resets on game restart.
- The test suite must verify that high scores are loaded from and saved to localStorage correctly.
- The test suite must ensure proper cleanup of timers, animation frames, and event listeners on component unmount.

## Metadata
- Programming Languages: JavaScript
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
