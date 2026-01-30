# WWVL0J - note taking application

**Category:** sft

## Overview
- Task ID: WWVL0J
- Title: note taking application
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wwvl0j-note-taking-application

## Requirements
- Implement secure registration and login with email/password, hash passwords using passlib with bcrypt, issue JWT tokens for API authentication, and create protected routes requiring valid tokens
- Build a split-pane editor with a textarea on the left and rendered Markdown preview on the right, supporting common Markdown features (headings, lists, code blocks, links, images), with the preview updating in real-time as the user types
- Automatically save note content to the server after the user stops typing for 1 second using debouncing, show a subtle saving/saved indicator in the UI, and handle offline scenarios gracefully by queuing saves
- Allow users to create notebooks to group related notes, display notes organized by notebook in a sidebar, support moving notes between notebooks, and provide an "All Notes" view showing everything
- Implement full-text search across note titles and content, display search results with highlighted matching text, and allow filtering notes by notebook with the search query applying within the selected context
- Display notes in a sidebar list showing title and last modified date, sort by most recently modified by default, support keyboard navigation between notes, and show note count per notebook

## Metadata
- Programming Languages: TypeScript
- Frameworks: Vue3, TailwindCSS
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
