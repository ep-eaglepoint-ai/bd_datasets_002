# LMXG02 - Strict Case State Transition Validator

**Category:** sft

## Overview
- Task ID: LMXG02
- Title: Strict Case State Transition Validator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: lmxg02-strict-case-state-transition-validator

## Requirements
- Must never mutate the input caseItem; all updates must be done on a new object
- Must reject unknown action types and include a reason with code UNKNOWN_ACTION.
- Must reject actions missing required fields with reason code MISSING_REQUIRED_FIELD
- Must use strict TypeScript typing and discriminated unions for actions and results
- Must safely handle malformed inputs without crashing or corrupting data.
- Must enforce the allowed state transitions exactly as defined, with no extra or missing transitions.

## Metadata
- Programming Languages: TypeScript (Node.js runtime, no external libraries)
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
