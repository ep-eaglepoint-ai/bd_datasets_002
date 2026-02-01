# 1MW4KX - gratitude journaling app

**Category:** sft

## Overview
- Task ID: 1MW4KX
- Title: gratitude journaling app
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 1mw4kx-gratitude-journaling-app

## Requirements
- Present a clean, distraction-free screen with three text fields for today's gratitude entries, gentle placeholder prompts that rotate daily (e.g., "Something that made you smile...", "A person you appreciate..."), and auto-save as the user types
- Implement passwordless login where users enter their email and receive a secure login link, creating a frictionless entry point that encourages daily use without password barriers
- Display a calendar view where days with entries are highlighted, allow clicking any date to read that day's gratitude entries, and show the current streak of consecutive days with entries
- When a user has entries from exactly one year ago (or other anniversaries), display a "On This Day" card showing what they were grateful for, creating meaningful moments of reflection
- Analyze all entries to extract common words and themes, display a visual word cloud showing what the user is most frequently grateful for, with the ability to click a word to see all entries containing it
- Track the user's current consecutive day streak and longest streak ever, display total number of gratitude items logged, and show a simple chart of entries per week to encourage consistency

## Metadata
- Programming Languages: TypeScript
- Frameworks: Remix
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
