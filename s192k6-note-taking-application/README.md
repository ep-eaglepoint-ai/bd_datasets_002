# S192K6 -  Note-Taking Application

**Category:** sft

## Overview
- Task ID: S192K6
- Title:  Note-Taking Application
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: s192k6-note-taking-application

## Requirements
- All notes and tags must persist across application restarts and server failures
- Tag usage counts must be accurately maintained and queryable
- Users must be able to create new notes with title, content, and tags
- Users must retrieve individual notes by identifier
- Users must retrieve all notes or filtered collections based on tag selection
- Users must update note content and tag associations
- Users must be able to permanently delete notes from the system
- Notes must support zero or more tags
- Tags must be reusable across multiple notes
- Tags must be globally unique by name
- Users must be able to add or remove tags from notes
- The system must efficiently query all unique tags and their usage counts
- Users must be able to view a complete list of all tags with usage counts
- Users must be able to filter notes by selecting a single tag  and Only notes containing the selected tag must be displayed
- Client interface must be implemented using React
- Server must be implemented using Node.js with Express
- Data must be stored in a PostgreSQL relational database

## Metadata
- Programming Languages: Javascript, Typescript, SQL
- Frameworks: React, Express
- Libraries: (none)
- Databases: PostgreSQL
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
