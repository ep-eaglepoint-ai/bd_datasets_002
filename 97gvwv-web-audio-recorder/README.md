# 97GVWV - Web Audio Recorder
**Category:** sft

## Overview
- Task ID: 97GVWV
- Title: Web Audio Recorder
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 97gvwv-web-audio-recorder

## Requirements
- Users must be able to play back recordings immediately after completion without downloading.
- Playback must include custom controls (play/pause, seek, volume) and display current time and total duration.
- Player must be keyboard accessible and integrated seamlessly into the existing dark minimal aesthetic.
- Recording metadata (duration, file size, sample rate) must be displayed.
- Users must see a real-time microphone input level before recording starts.
- Input meter must display green/yellow/red zones for optimal, quiet, and clipping levels.
- Users must be able to create and manage multiple recordings in one session.
- Each recording must include timestamp, duration, unique ID, and file size.
- Users must be able to play, download, and delete individual recordings.
- The system must enforce a maximum of 10 recordings or 50MB total per session.
- Optional: “Download All” feature to export multiple recordings in a single ZIP file.
- Recording list must update smoothly with animations and highlight the currently playing item.
- All functionality must be implemented entirely in-browser using Web APIs.
- No external libraries, unsafe code, or cloud services may be used.
- Proper error handling must cover microphone denial, browser incompatibility, memory limits, and playback failures.
- UI must remain responsive, minimal, and mobile-friendly without blocking the main thread.
- Playback, live monitoring, and session manager must work together without conflicts.
- All features must pass cross-browser and mobile responsiveness tests.
- No memory leaks or console errors should occur during normal operation.

## Metadata
- Programming Languages: Html, CSS, JavaScript, Python
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
