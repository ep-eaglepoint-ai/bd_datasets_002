# 5RITKB - personalized reading tracker

**Category:** sft

## Overview
- Task ID: 5RITKB
- Title: personalized reading tracker
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5ritkb-personalized-reading-tracker

## Requirements
- Build and integrate a mock api powered by a json file to search for books by title or author, display results with cover images, and allow users to add books to their shelves (Want to Read, Currently Reading, Finished) with one click
- For books marked "Currently Reading," allow users to update their progress by page number or percentage, show a visual progress bar on each book card, and track when progress was last updated
- Enable users to write private notes and highlights for any book, add a star rating (1-5) and written review when marking a book as finished, and view all notes for a book on its detail page
- Organize books into three main shelves with counts displayed, allow custom shelf creation for additional organization (e.g., "Favorites", "To Re-read"), and support moving books between shelves
- Let users set a goal for number of books to read in the current year, display progress toward the goal with a visual indicator, and show projected completion based on current pace
- Show a dashboard with total books read, pages read, and average rating given, display a chart of books finished per month for the current year, and calculate average reading time per book based on start/finish dates

## Metadata
- Programming Languages: TypeScript, Python
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
