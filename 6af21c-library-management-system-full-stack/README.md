# 6AF21C - Library Management System (Full-Stack)

**Category:** sft

## Overview
- Task ID: 6AF21C
- Title: Library Management System (Full-Stack)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 6af21c-library-management-system-full-stack

## Requirements
- 1. Book Catalog Display a list of all books with: Title Author ISBN Available copies Total copies Availability status (Available / Out of Stock) Books should be: Searchable by title or author Sortable by title, author, or availability
- 2. Book Details View detailed information for a single book: Title Author ISBN Total copies Available copies Created date Historical data must be read-only.
- 3. Borrowing Books Only authenticated users can borrow books Borrowing reduces available copies by exactly 1 A book cannot be borrowed if no copies are available Borrowing must be atomic (no race conditions) Confirmation message after successful borrow
- 4. Returning Books Only authenticated users can return books Returning increases available copies by exactly 1 A book cannot exceed total copies Confirmation message after successful return
- 5. Borrowing History Track all borrowing activity: Book User Action (BORROW / RETURN) Timestamp History is append-only and read-only.
- 6. User Authentication Email/password authentication User registration with name and email JWT-based authentication Only logged-in users can borrow or return books

## Metadata
- Programming Languages: Javascript, Typescript, Css and PostgreSQL
- Frameworks: Backend: Node.js with Express, Frontend: React (Vite), Styling: Tailwind CSS
- Libraries: Authentication: JWT
- Databases: PostgreSQL
- Tools: Containerization: Docker + docker-compose
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
