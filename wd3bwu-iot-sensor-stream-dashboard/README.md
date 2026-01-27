# WD3BWU - iot-Sensor-Stream-Dashboard

**Category:** sft

## Overview
- Task ID: WD3BWU
- Title: iot-Sensor-Stream-Dashboard
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: wd3bwu-iot-sensor-stream-dashboard

## Requirements
- The Vue.js frontend must render 50 concurrent sparklines updating at 10Hz without dropping below 60fps.
- The backend must implement a sliding-window buffer in memory to support immediate 'last 10 minutes' queries without hitting the primary database for every request.
- Implement a WebSocket protocol that supports 'subscriptions': a client should only receive data for the sensors currently visible in the viewport.
- The system must handle a 'thundering herd' scenario where 100 clients refresh the page and request historical data simultaneously.
- Alert Logic: Trigger a visual state change only if the threshold violation is sustained across three consecutive data packets.
- Testing Requirement: Include a backend unit test verifying that the memory buffer correctly evicts the oldest data points when the window size is exceeded.

## Metadata
- Programming Languages: JavaScript
- Frameworks: vue.js, express.js
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
