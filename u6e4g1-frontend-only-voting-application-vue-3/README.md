# U6E4G1 - Frontend-Only Voting Application (Vue 3)

**Category:** sft

## Overview
- Task ID: U6E4G1
- Title: Frontend-Only Voting Application (Vue 3)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: u6e4g1-frontend-only-voting-application-vue-3

## Requirements
- Use Vue 3 with Composition API and <script setup>
- Frontend-only (no backend, no external APIs)
- Modular, reusable component architecture
- Create, edit, duplicate, and delete polls
- Poll fields: title, description (optional), dynamic options, tags
- Support single-choice and multi-choice voting
- Configurable start and end time for polls
- Poll status handling: active, closed, expired
- Prevent duplicate voting per poll (per browser/session)
- Allow anonymous or named voting (client-side only)
- Lock votes and results when poll ends
- Real-time vote count and percentage updates
- Use Pinia for state management
- Persist polls and votes using LocalStorage
- Hydrate state on app reload

## Metadata
- Programming Languages: TypeScript
- Frameworks: Vue 3
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
