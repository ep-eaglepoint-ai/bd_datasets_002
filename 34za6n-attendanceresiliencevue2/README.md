# 34ZA6N - attendanceResilienceVue2

**Category:** sft

## Overview
- Task ID: 34ZA6N
- Title: attendanceResilienceVue2
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 34za6n-attendanceresiliencevue2

## Requirements
- State Machine Architecture: Implement a Vuex store where every asynchronous entity includes 'data', 'status' (idle, loading, error, success), and 'lastErrorMessage' properties.
- Vuetify Feedback Loops: Build components utilizing 'v-skeleton-loader' for initial data loads and 'v-snackbar' or 'v-alert' for surfacing asynchronous API errors.
- Optimistic Update & Rollback: Implement a 'toggleAttendance' action that immediately updates the local Vuex state but initiates a background API call. If the call fails, the store must revert to the previous valid state and notify the user.
- Mock API Layer: Author a service that returns Promises with configurable delay and failure rates to simulate a production environment without a live backend.
- Data Normalization: The Vuex store must normalize attendance records by their unique ID to ensure that an update to one record is propagated across all components using that data without redundant API calls.
- Actionable Retries: Components must provide a 'Retry' mechanism for failed requests, which re-triggers the specific Vuex action responsible for the failed state.
- Testing (State Transitions): Verify that the 'status' property in the store correctly transitions from 'loading' to either 'success' or 'error' and never gets stuck in a pending state.
- Testing (UI Resilience): Demonstrate that the UI remains interactive and provides visual feedback (e.g., 'v-progress-circular') while multiple concurrent background updates are in flight.
- Testing (Data Integrity): Verify that after a simulated 500 error during an optimistic update, the final state of the store matches the 'server' state exactly, with no 'ghost' updates remaining in the UI.

## Metadata
- Programming Languages: JavaScript
- Frameworks: vue2
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
