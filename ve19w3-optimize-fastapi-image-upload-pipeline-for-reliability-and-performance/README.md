# VE19W3 - Optimize FastAPI Image Upload Pipeline for Reliability and Performance

**Category:** sft

## Overview
- Task ID: VE19W3
- Title: Optimize FastAPI Image Upload Pipeline for Reliability and Performance
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ve19w3-optimize-fastapi-image-upload-pipeline-for-reliability-and-performance

## Requirements
- Support uploads up to 50MB
- Upload reliably to S3 storage
- Resume uploads on failure
- Avoid corrupted files
- Improve upload performance
- Maintain API compatibility

## Metadata
- Programming Languages: Python
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
