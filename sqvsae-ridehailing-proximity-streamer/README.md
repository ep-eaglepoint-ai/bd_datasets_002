# SQVSAE - rideHailing-Proximity-Streamer

**Category:** sft

## Overview
- Task ID: SQVSAE
- Title: rideHailing-Proximity-Streamer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: sqvsae-ridehailing-proximity-streamer

## Requirements
- Session Management: Map incoming WebSocket connections to `rideId` and `userId`. A user should only receive broadcasts for the specific ride they have successfully subscribed to.
- Real-time Proximity Calculation: For every telemetry packet received, perform a server-side distance calculation. If the driver is <= 100m from the pickup, trigger the 'NEARBY_NOTIFICATION' exactly once as the boundary is crossed.
- Heartbeat & Cleanup: Implement a server-side heartbeat monitoring system to detect and drop idle or 'zombied' WebSocket connections within 30 seconds of inactivity to preserve server resources.
- Message Sequencing: Ensure that the backend preserves the strict order of location updates so that clients do not receive jittery or out-of-order coordinate jumps.
- Data Leak Prevention: Explicitly validate that coordinate data from Driver A is never accessible to any WebSocket subscriber connected to a different Ride ID.
- Testing Requirement: Write an integration test where a driver 'moves' through three updates (120m, 95m, 90m). Verify the 'NEARBY_NOTIFICATION' is only dispatched at the 95m update.
- Testing Requirement: Verify that if a ride is marked 'completed' in the database, all associated WebSocket subscribers are immediately disconnected by the backend.
- Testing Requirement: Mock a high-load scenario where the backend processes 1,000 updates/second; verify the processing latency for distance calculation is under 20ms.
- Distributed Fan-Out: Design the backend to use a pub/sub mechanism (like Redis or NATS) to allow location updates to be shared across multiple service nodes in a horizontally scaled cluster.

## Metadata
- Programming Languages: Go, JavaScript, Python
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
