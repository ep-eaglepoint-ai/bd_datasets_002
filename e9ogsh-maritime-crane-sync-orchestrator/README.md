# E9OGSH - maritime-Crane-Sync-Orchestrator

**Category:** sft

## Overview
- Task ID: E9OGSH
- Title: maritime-Crane-Sync-Orchestrator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: e9ogsh-maritime-crane-sync-orchestrator

## Requirements
- Temporal Telemetry Alignment: Implement a synchronization logic that pairs the most recent telemetry pulses from Crane-A and Crane-B based on their internal timestamps. The system must ensure that the 'Tilt Delta' calculation is performed on the most closely aligned data points available to avoid false positives caused by network lag.
- Real-Time Safety Interlock: The service must calculate the absolute difference between the vertical positions of both cranes. If `|Z_A - Z_B| > 100mm`, the system must transition to a 'FAULT' state and issue immediate 'HALT' commands to both cranes within a maximum processing window of 10ms from the moment the threshold is crossed.
- Liveness Watchdog: Implement a monitor that tracks the arrival frequency of telemetry for each crane ID. If a specific crane fails to provide a valid update within 150ms, the system must initiate an emergency shutdown of the entire tandem operation to prevent 'Blind Lifting' where one side's position is unknown.
- High-Concurrency Performance: Utilize Java's modern concurrency primitives (e.g., CompletableFuture, AtomicReference, or Lock-free structures) to ensure the service can process thousands of updates per second. The ingestion of new telemetry must never be blocked by the evaluation logic or the command dispatching system.
- Atomic State Management: Ensure that the global state of the tandem lift (IDLE, LIFTING, FAULT) is managed atomically. Once a 'HALT' command is issued due to a safety violation, no subsequent 'MOVE' commands from the operator can be executed until a manual reset is performed.
- Testing Requirement (Drift Simulation): Write an integration test where Crane-A ascends at 100mm/s and Crane-B ascends at 80mm/s. Verify that the 'HALT' signal is triggered exactly 5 seconds into the lift as the 10cm threshold is breached.
- Testing Requirement (Jitter Resilience): Mock a scenario where Crane-A's telemetry arrives with a 100ms delay while Crane-B remains on time. Verify that the system correctly identifies the data as 'Stale' and refuses to authorize further movement until synchronized telemetry is restored.

## Metadata
- Programming Languages: Java
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
