# QN5PVS - Deterministic Audit Trail Builder for Admin Actions

**Category:** sft

## Overview
- Task ID: QN5PVS
- Title: Deterministic Audit Trail Builder for Admin Actions
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: qn5pvs-deterministic-audit-trail-builder-for-admin-actions

## Requirements
- Action type validation  Accept only: CREATE, UPDATE, DELETE, LOGIN, LOGOUT  Any other action type must be rejected with a structured reason (code + field + message)
- Timestamp parsing and normalization  occurredAt must be parsed from string, number, or Date  Output timestamp must be an ISO 8601 string  If the timestamp cannot be parsed, the action must be rejected with a structured reason
- Actor resolution and normalization  The module must handle multiple actor formats (object forms, colon-delimited strings, raw IDs)  For valid actions, actor must be normalized into:  actorId (non-empty string)  actorType (USER | SERVICE | SYSTEM)  displayName (must follow fallback rules)  If actor cannot be resolved into a valid actorId and actorType, the action must be rejected with a structured reason
- Stable event ID generation  Each valid audit entry must include an eventId that is stable and reproducible from normalized values  No randomness is allowed (same input must always produce the same eventId)
- Human-readable summary generation  Each valid entry must include a summary based on action type:  CREATE: “{actor} created {entity}”  UPDATE: “{actor} updated {entity}”  DELETE: “{actor} deleted {entity}”  LOGIN: “{actor} logged in”  LOGOUT: “{actor} logged out”  {entity} must be derived from entityType + entityId when available, otherwise use a safe fallback
- UPDATE snapshot and change extraction rules  For UPDATE actions:  If before or after exists, then both must exist and both must be plain objects; otherwise reject with a structured reason  When both snapshots are valid, generate field-level changes using dot-paths for nested fields  Only compare JSON-safe primitives (string | number | boolean | null)  If a field value is an array/object, ignore that field during change extraction (do not error)  Do not include unchanged fields in the output changes  For non-UPDATE actions: changes must be an empty array
- Invalid action handling  Invalid actions must be returned separately (do not drop them)  Each invalid action must include the original raw input and structured validation issues (code + field + message)  Invalid actions must never affect the list of valid audit entries

## Metadata
- Programming Languages: TypeScript (Node.js runtime, standard library only, no external dependencies)
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
