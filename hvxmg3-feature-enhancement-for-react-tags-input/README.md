# HVXMG3 - Feature Enhancement for React Tags Input

**Category:** sft

## Overview
- Task ID: HVXMG3
- Title: Feature Enhancement for React Tags Input
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hvxmg3-feature-enhancement-for-react-tags-input

## Requirements
- The component must continue to support adding tags using the Enter key without any change in existing behavior.
- The component must allow tags to be removed by clicking on them, preserving current delete functionality.
- The component must display autocomplete suggestions filtered from a predefined list based on user input.
- Autocomplete suggestions must be case-insensitive and must not include already-added tags.
- The suggestions dropdown must appear only when the input contains at least two characters and matching results exist.
- The autocomplete dropdown must support keyboard navigation using ArrowUp, ArrowDown, Enter, and Escape keys.
- Users must be able to select autocomplete suggestions using both keyboard input and mouse clicks.
- The component must enforce a maximum limit of five tags.
- When the tag limit is reached, the input must be disabled and a “Maximum tags reached” message displayed.
- When four tags are present, a visual warning indicating “1 tag remaining” must be shown.
- A tag counter displaying the current number of tags out of the maximum allowed must always be visible.
- Tags must be reorderable using native HTML5 drag-and-drop functionality without external libraries.
- Drag-and-drop functionality must be disabled when fewer than two tags exist.
- Tag input must be validated to ensure length and allowed characters before being added.
- The component must persist tags to localStorage on every change and restore them on component mount, handling localStorage unavailability gracefully.

## Metadata
- Programming Languages: JavaScript
- Frameworks: React 18
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
