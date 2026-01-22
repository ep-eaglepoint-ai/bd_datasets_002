# 9IZIN5 - lempel-ziv-welch-decompression

**Category:** rl

## Overview
- Task ID: 9IZIN5
- Title: lempel-ziv-welch-decompression
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 9izin5-lempel-ziv-welch-decompression

## Requirements
- When binary data is written to a file, every single byte of the input data must be persisted to disk. No bytes should be dropped, truncated, or omitted during the file writing process.
- When the decompressed bit string does not align to an 8-bit byte boundary, padding must be applied correctly. The padding scheme must be reversible and must not corrupt or truncate the actual data.
- All loops that iterate over collections (arrays, lists, strings) must process every required element. Off-by-one errors, incorrect slice boundaries, or premature loop termination are not acceptable.
- Every function name must accurately describe what the function does. A function that performs decompression must not be named as if it performs compression, and vice versa.
- The LZW dictionary (lexicon) must be maintained consistently throughout the decompression process. All dictionary operations (lookups, insertions, key transformations) must preserve the algorithm's invariants.
- The remove_prefix function must correctly identify and remove the size prefix from compressed data, returning exactly the compressed payload with no extra or missing bits
- When converting a string of '0' and '1' characters to actual bytes, each 8-character chunk must be correctly interpreted as a binary number and converted to its byte representation.
- The implementation must correctly handle edge cases including:Empty input files,Very small inputs (1-7 bits after prefix removal), Inputs where decompressed length is an exact multiple of 8 and Inputs requiring maximum padding
- If data is compressed with a valid LZW compressor and then decompressed with this implementation, the output must be byte-identical to the original input.

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
