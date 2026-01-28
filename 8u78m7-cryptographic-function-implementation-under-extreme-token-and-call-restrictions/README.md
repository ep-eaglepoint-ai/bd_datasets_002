# 8U78M7 - Cryptographic Function Implementation Under Extreme Token and Call Restrictions

**Category:** sft

## Overview
- Task ID: 8U78M7
- Title: Cryptographic Function Implementation Under Extreme Token and Call Restrictions
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8u78m7-cryptographic-function-implementation-under-extreme-token-and-call-restrictions

## Requirements
- Implement a single Python function that:  Accepts exactly one argument: a bytes object  Computes the SHA3-256 digest of the input  XORs each byte of the digest with 0xA5  Returns the result as a lowercase hexadecimal string of exactly 64 characters, with no prefix
- The following constraints must be strictly enforced:  The character sequence import must not appear anywhere in the response.  The exact consecutive character sequence hashlib must not appear anywhere in the response.  No function may be called whose name contains the substring hash or sha.
- No external dependencies, dynamic execution, reflection, or side effects are allowed.

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
