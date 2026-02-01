# BBYHBL - custom countdown timer

**Category:** sft

## Overview
- Task ID: BBYHBL
- Title: custom countdown timer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: bbyhbl-custom-countdown-timer

## Requirements
- Build a form to create countdowns with event name, target date and time with timezone selection, optional description, and background customization
- Show a beautiful full-screen countdown with animated flipping numbers or smooth transitions, displaying days, hours, minutes, and seconds, with the background and theme chosen during creation
- Generate unique short URLs for each countdown that anyone can view without logging in, displaying the countdown in a read-only mode with all visual styling preserved
- For logged-in users, display all their countdowns in a grid view sorted by nearest date, showing a preview card with countdown name, days remaining, and thumbnail of the background
- Handle three states elegantly—upcoming (showing time remaining), happening now , and past (showing "X days ago" with option to reset or archive)
- Offer preset themes (minimal, celebration, elegant, neon) that control font styles, number animations, and overlay effects, plus custom color picker for text and accent colors

## Metadata
- Programming Languages: TypeScript
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
