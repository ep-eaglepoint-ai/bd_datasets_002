# NDWKOQ - Client-Side Deterministic Image-to-PDF converter  Engine

**Category:** sft

## Overview
- Task ID: NDWKOQ
- Title: Client-Side Deterministic Image-to-PDF converter  Engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ndwkoq-client-side-deterministic-image-to-pdf-converter-engine

## Requirements
- 100% Client-side. No backend, no API dependencies, no telemetry.
- Use jsPDF for coordinate-based layout and binary PDF construction.
- Reactive ordering system allowing for drag-and-drop re-prioritization of image pages.
- UI must remain responsive during conversion; use requestIdleCallback or async chunking if processing more than 10 images.
- Explicitly reject non-image types and files exceeding 50MB per unit.
- Modular components

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
