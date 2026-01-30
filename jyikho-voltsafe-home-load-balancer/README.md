# JYIKHO - voltsafe-home-load-balancer

**Category:** sft

## Overview
- Task ID: JYIKHO
- Title: voltsafe-home-load-balancer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: jyikho-voltsafe-home-load-balancer

## Requirements
- Atomic Capacity Validation: The FastAPI backend must use a database transaction or a thread-safe locking mechanism to calculate the sum of active device wattages and validate the 5000W threshold. This must prevent race conditions where concurrent requests allow the total sum to exceed the safety limit.
- Reactive Load Visualization: The Vue.js frontend must implement a reactive 'Current Consumption' meter that updates immediately upon any device state change. This component should visually distinguish between 'Safe' and 'Near-Limit' states to improve user awareness of their power overhead.
- Idempotent State Transitions: Ensure that the toggle API is idempotent; sending multiple 'ON' signals for an already active device should not result in multiple wattage additions or state corruption in the persistent storage layer.
- Persistence Integrity: Model the appliance data using a structured schema (id, name, wattage, is_on) and ensure all state changes are committed to a database before the API returns a success status to the client.
- Testing Requirement (Collision): Simulate 50 concurrent requests to activate a 3000W device in a system with 3000W already utilized. Verify that the final total load remains at 3000W and all 50 new requests return a 403 Forbidden or 400 Bad Request error.
- Testing Requirement (Precision): Provide a test case verifying that the system accurately calculates fractional wattage (e.g., 2500.5W + 2499.6W = 5000.1W) and rejects the transition even if it exceeds the limit by a single decimal point.

## Metadata
- Programming Languages: JavaScript, Python
- Frameworks: FastAPI, Vue.js
- Libraries: SQLAlchemy, Tortoise-ORM, Axios
- Databases: PostgreSQL
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: "API Latency < 50ms", "Lock Contention Minimization"
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
