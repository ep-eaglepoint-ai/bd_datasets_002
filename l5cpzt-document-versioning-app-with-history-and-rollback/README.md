# L5CPZT - Document Versioning App with History and Rollback

**Category:** sft

## Overview
- Task ID: L5CPZT
- Title: Document Versioning App with History and Rollback
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: l5cpzt-document-versioning-app-with-history-and-rollback

## Requirements
- User authentication (register, login, JWT-based access)
- Create, edit, delete, and view text documents
- Automatic version creation on every document update
- View version history for each document
- Roll back a document to any previous version
- Access control so users manage only their own documents
- Simple UI using Vue 3 with API-based backend in Django

## Metadata
- Programming Languages: TypeScript, Python
- Frameworks: Vue 3 , Django
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
