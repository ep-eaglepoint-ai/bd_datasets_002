# TSKEHJ - Legacy React Class To-Do List Component (No Hooks, Backward-Compatible)

**Category:** sft

## Overview
- Task ID: TSKEHJ
- Title: Legacy React Class To-Do List Component (No Hooks, Backward-Compatible)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: tskehj-legacy-react-class-to-do-list-component-no-hooks-backward-compatible

## Requirements
- Must use React class components only ,   Must not use Hooks, functional components, or modern syntax that breaks legacy support
- Must provide an input field and an Add button , Clicking Add must append a new task to the list immediately
- Must store tasks only in component state (in-memory)
- Must not mutate state directly (must use safe state updates)
- Must remain responsive with 100+ tasks , Must avoid unnecessary re-renders caused by handler rebinding or per-item object churn

## Metadata
- Programming Languages: JavaScript (ES5/ES6 compatible) using React + ReactDOM only
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
