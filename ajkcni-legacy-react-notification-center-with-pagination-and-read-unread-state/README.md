# AJKCNI - Legacy React Notification Center with Pagination and Read/Unread State

**Category:** sft

## Overview
- Task ID: AJKCNI
- Title: Legacy React Notification Center with Pagination and Read/Unread State
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ajkcni-legacy-react-notification-center-with-pagination-and-read-unread-state

## Requirements
- Must display a hard-coded, in-memory list of notifications
- Must support pagination with Next and Previous controls
- Read/Unread state must be preserved across page changes at all times
- Switching pages must not duplicate, lose, reorder, or corrupt notifications
- All actions must be usable with keyboard (Tab to focus, Enter to activate)
- No optional chaining (?.), nullish coalescing (??), or template literals
- No Context API, Redux, or any external state library
- Must use React class components only (React.Component or React.createClass)

## Metadata
- Programming Languages: JavaScript (ES5/ES6 compatible) + React class components (React, ReactDOM only)
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
