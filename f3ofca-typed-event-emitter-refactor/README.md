# F3OFCA - Typed-Event-Emitter-Refactor

**Category:** sft

## Overview
- Task ID: F3OFCA
- Title: Typed-Event-Emitter-Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: f3ofca-typed-event-emitter-refactor

## Requirements
- Schema Enforcement: Implement a registration mechanism where 'ORDER_CREATED', 'USER_AUTH_ATTEMPT', and 'SYSTEM_LOG' are bound to strict validation rules. Any attempt to emit an unregistered event or a malformed payload must throw a 'SchemaViolationError'.
- Asynchronous Dispatch: The Kernel must dispatch events to listeners asynchronously. A slow or blocking listener must not prevent the Kernel from returning control to the emitter or processing subsequent events.
- Middleware Pipeline: Support `.use(middleware)` where middleware can: (a) Modify the payload (e.g., anonymizing IP addresses in USER_AUTH_ATTEMPT), (b) Halt the event propagation, or (c) Inject metadata like `correlationId`.
- Resiliency Layer (DLQ): If a listener throws an error, the Kernel must catch it, log the failure, and move the failed event + error stack into a Dead Letter Queue for manual inspection. The process must not exit.
- Listener Circuit Breaker: Implement a mechanism where if a specific listener fails 3 times consecutively, it is automatically 'unplugged' from the bus for a cooling-off period (e.g., 30 seconds).
- Observability: The Kernel must expose a method `getStats()` that returns the count of successful dispatches, DLQ size, and currently 'tripped' circuit breakers.
- Data Shape Preservation: Ensure the 'SYSTEM_LOG' event level is strictly limited to the specified union type during validation.
- Testing Requirement: Provide a test case where an 'ORDER_CREATED' event is emitted with a missing 'id'. Verify that the event never reaches subscribers and is instead caught by the validation layer.
- Testing Requirement: Simulate a 'Slow Subscriber' using a 200ms delay and verify that the `emit` call resolves in < 10ms.
- Testing Requirement: Implement a test for the Circuit Breaker: Trigger 3 failures in a specific listener and verify the 4th event is not sent to that listener.

## Metadata
- Programming Languages: JavaScript
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
