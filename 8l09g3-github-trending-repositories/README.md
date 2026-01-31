# 8L09G3 - GitHub Trending Repositories

**Category:** sft

## Overview
- Task ID: 8L09G3
- Title: GitHub Trending Repositories
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8l09g3-github-trending-repositories

## Requirements
- The Python script must retrieve the top 10 trending repositories from GitHub using the public GitHub API.
- The script must not require any authentication (use only public APIs).
- The script should output the result in JSON format.
- The JSON output must include repository details: name, URL, stars, and description.
- Provide a Dockerfile that builds and runs the Python script.
- The Docker container must automatically run the Python script upon starting.
- The solution must be self-contained, requiring no local Python installation.
- Building and running the container should be possible with a single Docker command (docker build and docker run).
- Both the Python script (script.py) and Dockerfile must be complete, production-ready, and easy to use.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: Docker
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
