# E6WXTP - React Code Editor Reliability Fix

**Category:** sft

## Overview
- Task ID: E6WXTP
- Title: React Code Editor Reliability Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: e6wxtp-react-code-editor-reliability-fix

## Requirements
- Cannot restructure component hierarchy or state architecture
- Preserve all existing features and UI
- Fix all logic errors causing incorrect behavior
- Ensure correct and consistent state updates
- Correct React hooks dependency issues
- Proper error handling for edge cases
- undo/redo navigation must work as expected
- Search handles special characters and regex correctly
- Maintain all existing functionality

## Metadata
- Programming Languages: JavaScript, TypeScript
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
