# GYVYLD - Music Player Test Suite

**Category:** sft

## Overview
- Task ID: GYVYLD
- Title: Music Player Test Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: gyvyld-music-player-test-suite

## Requirements
- handleNext must advance to next track (index 0 → 1). handleNext at last track must wrap to first track (index 22 → 0).
- handlePrevious must go to previous track (index 5 → 4). handlePrevious at first track must wrap to last track (index 0 → 22).
- Both trackIndex AND trackIndexFromList must stay synchronized after navigation. Track object must update correctly after navigation.
- Clicking playlist item must set trackIndexFromList correctly and trigger track change via useEffect. Clicking currently playing track must NOT restart it (guard condition).
- Selecting track from playlist must auto-start playback (isPlaying becomes true when trackIndexFromList changes and differs from trackIndex).
- Volume change must update audioRef.current.volume correctly with 0-100 mapping to 0.0-1.0. Mute toggle must set audioRef.current.muted to true.
- Progress bar repeat callback must update timeProgress from audio currentTime. Division by zero must be handled when duration is 0 in the calculation currentTime/duration*100.
- skipForward must add exactly 10 seconds to currentTime. skipBackward must subtract exactly 10 seconds from currentTime.
- Skip backward must not go below 0 (clamp at beginning). Skip forward must not exceed duration (clamp at end).
- Behavior when audioRef.current is null (initial render) must not throw errors - functions must return early.
- requestAnimationFrame must be cancelled on unmount to prevent memory leaks. All audio sources must be mocked without actual network requests.

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
