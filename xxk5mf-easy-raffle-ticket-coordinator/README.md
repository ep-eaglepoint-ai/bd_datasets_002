# XXK5MF - Easy-Raffle-ticket-Coordinator

**Category:** sft

## Overview
- Task ID: XXK5MF
- Title: Easy-Raffle-ticket-Coordinator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xxk5mf-easy-raffle-ticket-coordinator

## Requirements
- Atomic Inventory Management: The Express backend must implement a transactional check during the purchase process to ensure that total tickets never exceed 100. This must handle race conditions so that multiple concurrent requests arriving at the same millisecond are processed such that only the available inventory is filled and the rest are rejected.
- Per-User Fairness Policy: Implement a server-side validation rule that tracks tickets by UserID and rejects any attempt to purchase more than 2 tickets per person. This limit must be enforced on the server to prevent users from bypassing restrictions through multiple client-side tabs or browser modifications.
- Cryptographic Admin Draw: Create a protected endpoint that allows only an authorized administrator to pick exactly one winner from the list of purchased tickets. The selection logic must utilize Node.js secure randomization (crypto.randomInt) to guarantee a statistically fair outcome for all participants.
- Reactive Participant Interface: The React frontend must include a dashboard displaying the tickets remaining (Count down from 100) and a purchase button that provides immediate visual feedback. The button should enter a loading state during processing and disable itself automatically if the server returns a 'Sold Out' status or the user reaches their personal cap.
- Data Visibility Isolation: Ensure that the identity of the winning ticket remains exclusively on the server until the admin initiates the draw event. The frontend should only show the result after a state transition from 'Open' to 'Closed', preventing users from identifying winners prematurely through inspecting network payloads.
- Testing Requirement (Concurrency): Perform a system integration test simulating 50 concurrent users attempting to buy 3 tickets each (150 total requests) against a 100-ticket inventory. Verify that exactly 100 ticket records exist in the backend state and exactly 50 users received an 'Inventory Exhausted' or 'Limit Reached' error.
- Testing Requirement (Error Handling): Validate that the React frontend correctly renders a descriptive error toast and enables the purchase button again if the initial server-side transaction fails due to a network timeout.
- Testing Requirement (Happy Path): Execute a unit test for the winner selection logic using a mock pool of 10 tickets. Verify that after 1,000 simulated draws, the distribution across the 10 tickets is within an acceptable statistical margin and never selects an ID outside the participating pool.

## Metadata
- Programming Languages: JavaScript, TypeScript
- Frameworks: Express, React
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
