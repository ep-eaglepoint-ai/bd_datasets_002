# D6PU1X - Real-Time chat Application

**Category:** sft

## Overview
- Task ID: D6PU1X
- Title: Real-Time chat Application
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: d6pu1x-real-time-chat-application

## Requirements
- Application must always initialize with zero conversations and zero messages.
- All chat data must exist only in memory.
- Conversations must be isolated.
- Conversation creation must be strictly user-driven.
- Each conversation must have:  A unique, immutable identifier  A creation timestamp that never changes
- Deleting the active conversation must:  Immediately remove it from state  Switch to another existing conversation if available  Otherwise, transition to the global empty/welcome state
- Switching between conversations must not trigger re-rendering of inactive conversations.
- Adding a message to one conversation must not cause sidebar items or message lists of other conversations to re-render.
- UI must remain responsive
- User messages must render immediately upon send (optimistic UI)
- Typing indicators must be implemented using CSS animations only.

## Metadata
- Programming Languages: Javascript
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
