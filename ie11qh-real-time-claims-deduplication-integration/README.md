# IE11QH - Real Time Claims Deduplication Integration

**Category:** sft

## Overview
- Task ID: IE11QH
- Title: Real Time Claims Deduplication Integration
- Category: sft
- Repository: eaglepoint-ai/bd_dataset_003
- Branch: ie11qh-real-time-claims-deduplication-integration

## Requirements
- Use composite key (ClaimId + PatientId + ServiceDateFrom) with case-sensitive matching. Empty fields, missing fields, or
- Keep claim with most recent ClaimSubittionDate when duplicates differ in amounts or service lines. If submission dates are identical, keep first encountered claim. Do not merge service lines.
- rack only one claim per unique key (O(unique claims) memory, not O(total claims)). Must support 5000+ claim b
- Maintain predictable order based on first encounter of each composite key. Identical input (same files, same order) must produce identical output order. When replacing claim, preserve original position
- Log all deduplication decisions including kept/discarded claim IDs, composite key details, resolution reason (newer date/first encounter), a
- Add functionality without refactoring existing code. Respect current function signatures, naming patterns, and architecture. All segment parsing logic (BHT, HI, CLM, DTP, NM1, LX, SV1, SV2, SBR, REF) must remain unchanged.
- Deduplication overhead under 10% of total processing time (70 seconds max for 1000 claims). Use O(1) operations per claim (map lookups only), no O(n) searches in hot path.
- No changes to claim.Claim structure, API contracts, public interfaces, existing error handling patterns, or logging behavior. No external dependencies beyond existing imports.
- Handle missing PatientId, zero-value ServiceDateFrom, and partial parsing failures gracefully without corrupting deduplication state. Preserve all existing error logging behavior.
- Support claims with identical keys but different amounts, missing composite key fields, multiple duplicates of same claim (3-4 versions), and identical submission dates between duplicates.

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
