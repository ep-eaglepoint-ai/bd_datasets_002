# 6BDLXL - React Notes: Advanced Features

**Category:** sft

## Overview
- Task ID: 6BDLXL
- Title: React Notes: Advanced Features
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 6bdlxl-react-notes-advanced-features

## Requirements
- Implement real-time, case-insensitive search across note titles and content.
- Add date range filtering (today, this week, this month, all time) based on updatedAt
- Ensure that search, tag filtering, and date filtering combine as AND conditions.
- Empty search input must return all notes respecting active tag and date filters.
- Export individual notes or all notes as JSON; individual notes can also be exported as formatted plain text.
- Import JSON containing single notes or arrays; handle malformed JSON gracefully.
- Avoid ID collisions by generating new IDs when importing duplicates.
- Validate required fields (title, content) and skip invalid notes while providing user feedback.
- Preserve original timestamps (createdAt, updatedAt) if present; otherwise, assign current timestamps.
- Preserve all existing functionality (create, edit, delete, tag filtering) without regression.
- Manage all state exclusively in React state (useState / useReducer). No localStorage or sessionStorage.
- Provide immediate visual reponse for all interactions (search, filter, export/import)
- Ensure filtering operations are efficient and do not trigger unnecessary re-renders.

## Metadata
- Programming Languages: Javascript
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
