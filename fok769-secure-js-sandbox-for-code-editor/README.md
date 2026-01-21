# FOK769 - Secure JS Sandbox for Code Editor

**Category:** sft

## Overview
- Task ID: FOK769
- Title: Secure JS Sandbox for Code Editor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: fok769-secure-js-sandbox-for-code-editor

## Requirements
- The sandbox must prevent user code from accessing or modifying the parent app, global objects, or dangerous browser APIs.
- Code execution must appear synchronous and handle snippets up to 5000 characters without freezing the UI.
- All console methods must be intercepted and restored, even if user code throws errors.
- No use of eval() or new Function() directly on untrusted code, and no external libraries or WebWorkers initially.
- The component must be self-contained, using only React functional components and hooks.

## Metadata
- Programming Languages: Javascript
- Frameworks: React
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
