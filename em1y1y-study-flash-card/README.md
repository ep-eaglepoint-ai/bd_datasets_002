# EM1Y1Y - study flash card

**Category:** sft

## Overview
- Task ID: EM1Y1Y
- Title: study flash card
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: em1y1y-study-flash-card

## Requirements
- Users must be able to create, rename, delete, and organize flash card decks, with each deck acting as a self-contained study set.
- Users should be able to create flash cards with a front (question/prompt) and back (answer/explanation), and edit or delete them anytime.
- The app must provide a dedicated study mode where users can flip cards, mark answers as correct or incorrect, and progress through a deck sequentially or randomly.
- The system should prioritize cards that users struggle with by resurfacing incorrect or difficult cards more frequently in future sessions.
- Users must be able to see session-level progress, such as cards reviewed, accuracy rate, remaining cards, and completion status.
- The app should track long-term stats per deck, including mastery percentage, review history, accuracy trends, and most-missed cards.
- Study mode should support keyboard shortcuts for flipping cards, marking answers, skipping cards, and navigating quickly for power users.
- Flash cards and study history should persist using local storage or a lightweight database, without requiring user authentication.
- The UI should be clean, minimal, mobile-friendly, and optimized to keep users focused on learning rather than interface complexity.
- Users should be able to export decks as JSON or CSV and import them back to allow backups, sharing, and portability.

## Metadata
- Programming Languages: TypeScript
- Frameworks: NextJs, Tailwindcss
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
