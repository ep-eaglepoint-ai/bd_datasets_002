# XIK938 - Write-Ahead Log  with  Integrity and Torn-Write Recovery

**Category:** sft

## Overview
- Task ID: XIK938
- Title: Write-Ahead Log  with  Integrity and Torn-Write Recovery
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xik938-write-ahead-log-with-integrity-and-torn-write-recovery

## Requirements
- The code must write a header (Length/Type) before the data. Writing raw data without length prefixes is a failure (cannot be read back).
- The code must compute a CRC32 (or Adler32) of the record and store it. During recovery, it must re-compute and compare. Mismatch = Corruption.
- If the reader encounters an io.EOF or a Checksum Mismatch in the middle of reading a frame (at the end of file), it must treat this as a partial write.
- The constructor or recovery method must truncate the file to the last known good offset. If it leaves garbage at the end, new writes will be corrupted.
- The Sync() or Flush() method must call the underlying os.File.Sync() to force strict disk persistence.
- Writes must be protected by a Mutex.
- Must use binary.BigEndian (or Little) consistently.

## Metadata
- Programming Languages: Go (Golang 1.18+)
- Frameworks: (none)
- Libraries: os, encoding/binary, hash/crc32, io, sync
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
