# 5EFPQW - Overtime-Compliance-Guard

**Category:** sft

## Overview
- Task ID: 5EFPQW
- Title: Overtime-Compliance-Guard
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5efpqw-overtime-compliance-guard

## Requirements
- Rolling Window Validation: Calculate the total sum of hours for all shifts that fall within the 168-hour period prior to the proposed shift's end time. If the sum + new shift duration exceeds 40.0 hours, return a `StatusPolicyViolation` error.
- Rest-Interval Verification: Implement a check to ensure that the start time of the new assignment is at least 8 hours later than the end time of the most recent prior shift in the database for that specific employee.
- Overlapping Protection: Reject any new assignment that has any temporal overlap (even 1 minute) with an existing assigned shift for the same employee.
- Concurrency and Performance: The validation logic must use Go’s time-based comparisons efficiently to handle a staff list of 200+ individuals without causing delays during bulk-roster generation.
- Testing Requirement: Create a test where an employee has 38 hours scheduled; attempt to add a 3-hour shift. Verify the assignment is rejected and a specific error message about the 40-hour limit is returned.
- Testing Requirement: Verify that the 8-hour rest interval check correctly identifies a violation when a night shift ends at 06:00 and a new day shift is proposed for 12:00 the same day.

## Metadata
- Programming Languages: Go
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
