# BCM4WE - Heuristic Entropy & Pattern Detection for In-Memory Payloads

**Category:** sft

## Overview
- Task ID: BCM4WE
- Title: Heuristic Entropy & Pattern Detection for In-Memory Payloads
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: bcm4we-heuristic-entropy-pattern-detection-for-in-memory-payloads

## Requirements
- he code must read the file in chunks (e.g., 4KB buffers) using a generator or while loop. Loading the entire 2GB dump into a variable is an automatic failure
- The tool must identify sequences of identical or specific bytes (like 0x90) adjacent to high-entropy zones.
- The validator must look for basic decryption signatures, such as a loop incrementing a register and performing an XOR operation (e.g., 31 C9 type patterns in hex).
- The output must not just be "Found/Not Found" but a confidence score based on the combined factors (Entropy + Structure)
- Address calculations and integer parsing must explicitly use Little-Endian (<) unpacking logic relevant to x64 Linux
- Usage of yara, volatility, or pefile is a failure.
- The sliding window must overlap correctly so that a payload split across chunk boundaries is not missed
- Must output the exact hexadecimal Offset of the start of the suspected shellcode.
- The logic should ignore standard high-entropy regions (like large blocks of zeros or standard text) by requiring the "High Entropy + NOP Sled" combination.

## Metadata
- Programming Languages: python 3.10+
- Frameworks: (none)
- Libraries: math (for Entropy), struct (for binary reading), sys.
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
