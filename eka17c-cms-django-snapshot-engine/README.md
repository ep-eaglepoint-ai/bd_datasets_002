# EKA17C - Cms-Django-Snapshot-Engine

**Category:** sft

## Overview
- Task ID: EKA17C
- Title: Cms-Django-Snapshot-Engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: eka17c-cms-django-snapshot-engine

## Requirements
- Model Architecture: Define a 'Document' model (containing a slug and a reference to the live version) and a 'ContentVersion' model (containing the JSON data, a timestamp, and a foreign key to the Document).
- Immutability Enforcement: Implement logic at the model or manager level to ensure that once a 'ContentVersion' instance is saved, any subsequent attempt to modify its data results in a ValidationError or is blocked by a database constraint.
- Dynamic Validation: Implement strict schema validation for the JSONField within the 'ContentVersion' model. The system must reject any save attempt where the JSON structure does not meet a pre-defined schema (e.g., using a JSON Schema validator or a Python class-based validator).
- Atomic Promotion: Create a server-side action to 'Publish' a specific version. This must atomically update the Document's live pointer within a database transaction to prevent partial updates or orphaned states.
- minimal administrative UI: Provide a Django-based dashboard that lists all Documents and allows users to click into a 'History View.' This view must list all associated versions in reverse chronological order.
- Public Read-Only View: Implement a view that retrieves a Document by its slug and returns the content of the currently 'Live' version. If no version has been published for that document, it must return a 404.
- Testing: Author a suite of Django TestCases. Verify that: 1) Multiple saves for the same document result in multiple unique Version records. 2) Attempting to update an existing Version record fails. 3) The Public View output remains unchanged when new versions are added until the 'Publish' pointer is updated. 4) Deleting a Document removes all associated Versions via a cascaded delete.

## Metadata
- Programming Languages: Python
- Frameworks: Django
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
