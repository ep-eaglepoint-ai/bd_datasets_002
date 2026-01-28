# XFKHP4 - Shipment FSM breaks per-shipment dedup and deterministic applyEvent semantics

**Category:** sft

## Overview
- Task ID: XFKHP4
- Title: Shipment FSM breaks per-shipment dedup and deterministic applyEvent semantics
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xfkhp4-shipment-fsm-breaks-per-shipment-dedup-and-deterministic-applyevent-semantics

## Requirements
- Deduplication Must Be Scoped Per Shipment  Deduplication must apply within a shipment’s event stream, not globally.  Two different shipments must be allowed to receive the same (source, eventId) without interference.  What’s missing: The implementation deduplicates events globally across the entire store using (source, eventId) only, causing valid events for one shipment to be dropped because of events belonging to another shipment.
- Deduplication Must Respect Canonical Ordering  When duplicates exist, the first event by deterministic ordering (occurredAtMs, then arrival order) must win.  Deduplication decisions must be made after ordering semantics are resolved.  What’s missing: Although ordering is considered, deduplication decisions are recorded globally and can incorrectly override shipment-local ordering semantics.
- applyEvent Must Return a Deterministic, Interpretable Result  For every call to applyEvent, the returned ApplyResult must clearly indicate whether the event was applied or rejected and why.  The result must correspond to the specific event passed to that call, not an indeterminate future application.  What’s missing: When events are buffered due to ordering, applyEvent often returns applied: false with no reason, making it impossible for callers to know whether the event was invalid, duplicated, deferred, or blocked by terminal state.
- Public APIs Must Match the Declared Contract  listShipments() must behave as an iterable, not eagerly allocate and freeze a full snapshot array.  API behavior must align with documented expectations around laziness and memory usage.  What’s missing: The implementation eagerly materializes all shipment snapshots, violating the intended contract and scalability expectations.

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
