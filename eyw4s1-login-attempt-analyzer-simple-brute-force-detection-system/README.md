# EYW4S1 - Login Attempt Analyzer – Simple Brute-Force Detection System

**Category:** sft

## Overview
- Task ID: EYW4S1
- Title: Login Attempt Analyzer – Simple Brute-Force Detection System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: eyw4s1-login-attempt-analyzer-simple-brute-force-detection-system

## Requirements
- Build a backend using Django to store and manage login attempt data
- Record login attempts with username, IP address, timestamp, and success or failure status
- Implement a basic brute-force detection rule based on repeated failed attempts from the same IP
- Expose REST API endpoints to retrieve login attempts and flagged suspicious activity
- Build a frontend using Vue 3 to display login attempts in a table
- Highlight suspicious IP addresses or attempts in the UI
- Show basic statistics such as total attempts and failed attempts

## Metadata
- Programming Languages: TypeScript, Python
- Frameworks: Vue 3, Django
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
