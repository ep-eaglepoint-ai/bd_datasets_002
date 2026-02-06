# Trajectory

## Analysis
- The task requires a standalone pytest suite for `ingest_and_chunk.py` without modifying the script.
- Tests must validate `basic_clean`, `chunk_text`, `yield_documents`, and a subprocess integration run.
- The script imports `fitz`, so the environment must include `PyMuPDF` even if PDFs are not used in tests.

## Strategy
- Load the script with `importlib.util.spec_from_file_location` to avoid package-relative imports.
- Resolve the target repository directory using `sys.path` to support both `repository_before` and `repository_after`.
- Use `tmp_path` to create isolated inputs for file discovery and integration tests.
- Avoid PDFs in tests to keep execution lightweight while still validating `.txt` and `.md` behavior.

## Execution
- Copied `ingest_and_chunk.py` into `repository_after` unchanged to preserve the “no modifications” requirement.
- Implemented unit tests for:
  - Unicode normalization, control character removal, whitespace collapsing, and newline handling in `basic_clean`.
  - Chunk sizing and overlap logic in `chunk_text`, plus invalid overlap error handling.
  - File discovery in `yield_documents` for `.txt` and `.md` while ignoring unsupported types.
- Added an integration test that runs the script via subprocess, verifies JSONL output, and checks record schema and chunk-id format.

## Validation
- Tests run with pytest and include explicit assertions with helpful error messages.
- Docker commands documented in README for before/after testing and evaluation.
