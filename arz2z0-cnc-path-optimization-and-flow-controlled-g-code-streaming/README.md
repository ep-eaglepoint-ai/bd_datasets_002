# ARZ2Z0 - CNC Path Optimization and Flow-Controlled G-Code Streaming

**Category:** sft

## Overview
- Task ID: ARZ2Z0
- Title: CNC Path Optimization and Flow-Controlled G-Code Streaming
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: arz2z0-cnc-path-optimization-and-flow-controlled-g-code-streaming

## Requirements
- The backend must parse segments and re-sort them. If the output G-Code follows the exact input order of the SVG segments, it is a failure.
- The code must calculate the distance between the end of Segment A and the start of Segment B vs Segment C, picking the closest one.
- The WebSocket logic must implement a "Pause/Resume" or "Ack" mechanism. Sending the whole file in one socket message is an automatic failure.
- The React Canvas renderer must handle the coordinate flip (Y-axis inversion) correctly so the preview isn't upside down.
- The visualizer must differentiate G0 (Travel) from G1 (Cut) using different colors or line styles.
- The backend must include a dummy class acting as the machine that consumes line-by-line and returns acknowledgments, simulating latency.
- The system must accept raw line segment coordinates (x1, y1, x2, y2) and convert them to G0 X.. Y.. and G1 X.. Y...
- The streaming loop in Python must be non-blocking (asyncio) so the HTTP server remains responsive to status queries during a print job.
- The frontend must calculate the total width/height of the design to center it on the canvas.
- The UI must show "Printing", "Idle", or "Paused" based on the socket state.

## Metadata
- Programming Languages: python 3.10, React (Canvas api)
- Frameworks: Fast api,
- Libraries: (none)
- Databases: (none)
- Tools: canvas api
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
