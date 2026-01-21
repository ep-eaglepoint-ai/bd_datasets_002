# UULPIW - Implementation of a Browser-Native Image compressor  Engine.

**Category:** sft

## Overview
- Task ID: UULPIW
- Title: Implementation of a Browser-Native Image compressor  Engine.
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: uulpiw-implementation-of-a-browser-native-image-compressor-engine

## Requirements
- A transparent PNG uploaded remains transparent after compression.
- EXIF orientation data is respected (images don't end up sideways)
- The UI clearly displays: Original: 2.0MB | Compressed: 0.9MB | Saved: 55%.
- Uploading 5 images simultaneously does not freeze the Main Thread
- 100% Client-Side. No external API calls, backend dependencies, or server-side processing allowed.
- Must handle image/jpeg, image/png, and image/webp.
- All final exports must be encoded as image/png.
- Minimum 50% file size reduction compared to the source file.

## Metadata
- Programming Languages: TypeScript
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
