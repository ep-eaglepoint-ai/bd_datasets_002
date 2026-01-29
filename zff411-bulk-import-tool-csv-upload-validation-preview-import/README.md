# ZFF411 - Bulk Import Tool (CSV Upload + Validation + Preview + Import)

**Category:** sft

## Overview
- Task ID: ZFF411
- Title: Bulk Import Tool (CSV Upload + Validation + Preview + Import)
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: zff411-bulk-import-tool-csv-upload-validation-preview-import

## Requirements
- CSV upload input: The page provides a file input that accepts .csv files and rejects non-CSV files.
- Header parsing: The system parses the CSV using the first row as headers and reads all remaining rows as data.
- Required headers enforced: If any required header is missing (e.g., name,email,age), the UI shows an error and the Import button is disabled.
- Skip empty lines: Blank lines in the CSV are ignored and do not count as rows.
- Normalize values: All string cell values are trimmed (leading/trailing spaces removed) before validation.
- Row-by-row validation: Each row is validated independently using a shared schema (client + server).
- Row error detail: Each invalid row displays row number plus field-level error messages (e.g., email: Invalid email).
- Summary metrics: After parsing, the UI displays counts for Total rows, Valid rows, and Invalid rows.
- Preview table: The UI shows a preview of the first 20 rows including a status column (OK or errors).

## Metadata
- Programming Languages: TypeScript
- Frameworks: Next.Js
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
