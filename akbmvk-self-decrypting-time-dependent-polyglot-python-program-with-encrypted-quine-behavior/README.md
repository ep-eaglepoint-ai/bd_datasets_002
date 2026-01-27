# AKBMVK - Self‑Decrypting Time‑Dependent Polyglot Python Program with Encrypted Quine Behavior

**Category:** rl

## Overview
- Task ID: AKBMVK
- Title: Self‑Decrypting Time‑Dependent Polyglot Python Program with Encrypted Quine Behavior
- Category: rl
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: akbmvk-self-decrypting-time-dependent-polyglot-python-program-with-encrypted-quine-behavior

## Requirements
- Embed exactly one payload that is:  Base64‑encoded  Zlib‑compressed  Not present in plaintext anywhere in the script
- At runtime:  Read the current system clock minute  If the minute is even:  Decrypt the payload using XOR key A  Execute Python code that computes Hamming Distance between two binary strings  If the minute is odd:  Decrypt the same payload using XOR key B  Execute Python code that generates prime numbers up to 100 using the Sieve of Eratosthenes
- Decrypted code must be executed using exec()  Before execution, the script must print its own encrypted payload exactly (quine behavior)  All XOR logic and bit‑length calculations must be manually implemented  Use only Python standard library modules:  time, base64, zlib  No external libraries, no disk writes, no multiple payloads  Entire solution must exist in a single runnable Python 3 script

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
