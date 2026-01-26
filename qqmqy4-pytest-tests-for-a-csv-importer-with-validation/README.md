# QQMQY4 - Pytest tests for a CSV Importer with Validation

**Category:** sft

## Overview
- Task ID: QQMQY4
- Title: Pytest tests for a CSV Importer with Validation
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: qqmqy4-pytest-tests-for-a-csv-importer-with-validation

## Requirements
- Test that valid customer rows are inserted correctly.
- Test that rows with missing or blank required fields are skipped as invalid.
- Test that duplicate emails within the same CSV file are skipped.
- Test that emails already existing in the repository are skipped as duplicates.
- Assert that all fields in ImportStats are exactly correct.
- Verify the number of repository method calls.
- Verify the arguments passed to repository insert calls.
- Include edge cases such as empty CSV input.
- Include a header-only CSV with no data rows.
- Include CSV input with a mix of valid, invalid, and duplicate rows.
- Do not modify the production code.
- Do not use the file system; use the provided CSV text only.
- Use mocks or fakes for CustomerRepository.
- Ensure tests rely only on documented behavior of DictReader.

## Metadata
- Programming Languages: Python
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
