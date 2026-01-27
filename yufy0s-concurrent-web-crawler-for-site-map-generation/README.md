# YUFY0S - Concurrent Web Crawler for Site Map Generation

**Category:** rl

## Overview
- Task ID: YUFY0S
- Title: Concurrent Web Crawler for Site Map Generation
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: yufy0s-concurrent-web-crawler-for-site-map-generation

## Requirements
- Use threading for concurrency (max 5 threads).
- Crawl ≤100 unique URLs, max depth 3 from root.
- Parse robots.txt first and cache rules; skip disallowed URLs.

## Metadata
- Programming Languages: Python 3 (using standard libraries: urllib, html.parser, threading, queue, json, re + NetworkX for graph)
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
