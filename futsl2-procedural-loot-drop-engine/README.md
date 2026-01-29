# FUTSL2 - procedural-Loot-Drop-Engine

**Category:** sft

## Overview
- Task ID: FUTSL2
- Title: procedural-Loot-Drop-Engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: futsl2-procedural-loot-drop-engine

## Requirements
- Weighted Probability Selection: Implement a function that takes a list of item rarities with associated weights (e.g., Common: 900, Rare: 99, Legendary: 1) and returns a single rarity based on a random roll.
- Per-Player State Tracking: Use a `Map<PlayerID, PlayerLootState>` or a similar structure to maintain the 'pity timer' counter for each player independently.
- Pity Timer Logic: For every non-Legendary drop, increment the player's pity counter. If the counter reaches 50, the next drop must be forced to be 'Legendary', and the counter must reset to 0.
- State Reset on Success: The pity timer must reset to 0 only when a 'Legendary' item is dropped, whether it was through random chance or the pity timer itself.
- Testing Requirement (Pity Timer Guarantee): Write a test that simulates 49 consecutive non-Legendary drops for a single player. Verify that the 50th call to the loot generation function is guaranteed to return a 'Legendary' result.
- Testing Requirement (Statistical Accuracy): Simulate 1,000,000 loot drops with a 1% chance for a Legendary item. Verify that the final count of Legendary items is within a statistically acceptable margin of error (e.g., between 9,900 and 10,100).

## Metadata
- Programming Languages: Java
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
