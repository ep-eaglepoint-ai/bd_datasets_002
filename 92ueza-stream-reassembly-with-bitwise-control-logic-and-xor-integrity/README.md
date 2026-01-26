# 92UEZA - Stream Reassembly with Bitwise Control Logic and XOR Integrity

**Category:** sft

## Overview
- Task ID: 92UEZA
- Title: Stream Reassembly with Bitwise Control Logic and XOR Integrity
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 92ueza-stream-reassembly-with-bitwise-control-logic-and-xor-integrity

## Requirements
- The code must correctly identify and hold a message that is split across two inputs (e.g., Header in Input A, Payload in Input B).
- If a checksum fails, the parser must not crash or clear the whole buffer; it must advance one byte and search for 0xFA 0xCE again to recover subsequent valid messages.
- The code must use control_byte & 0x80 (or similar) to determine the parsing strategy (String vs Float), not == 128.
- The Length must be parsed as Big-Endian (>H), and the Floats as Big-Endian (>f). System default or Little-Endian is a failure
- The code must implement the XOR sum (^=) over the payload. Usage of simple addition sum() or CRC32 libraries is a failure.
- The buffer logic must use bytearray or efficient slicing. Appending strings or lists of integers is a performance failure (though functionally passable if logic holds).

## Metadata
- Programming Languages: Python 3.10+
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
