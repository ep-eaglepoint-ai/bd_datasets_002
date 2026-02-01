# P9AZPG - movie watchlist

**Category:** sft

## Overview
- Task ID: P9AZPG
- Title: movie watchlist
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: p9azpg-movie-watchlist

## Requirements
- Allow users to add movies to three default lists (Want to Watch, Watching, Watched) with one click, display movie counts per list, and enable quick moving of movies between lists from any view
- Show a detailed page for each movie with full poster, synopsis, cast highlights, runtime, genres, and TMDB rating, plus the user's personal rating and notes if they've watched it
- When marking a movie as watched, prompt users to add a star rating (1-5) and optional written review, display these personal ratings on movie cards and allow editing later
- Enable users to create unlimited custom lists with names and optional descriptions, add any movie to multiple custom lists, and reorder movies within lists via drag-and-drop
- Show a simple stats dashboard with total movies watched, average rating given, favorite genres based on highly-rated watches, and a breakdown of movies watched per month this year

## Metadata
- Programming Languages: TypeScript
- Frameworks: Svelte, Sveltekit
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
