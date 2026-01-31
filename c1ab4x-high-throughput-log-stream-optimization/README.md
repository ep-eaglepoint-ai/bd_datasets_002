# C1AB4X - High-Throughput Log Stream Optimization 

**Category:** sft

## Overview
- Task ID: C1AB4X
- Title: High-Throughput Log Stream Optimization 
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: c1ab4x-high-throughput-log-stream-optimization

## Requirements
- Must NOT use io.ReadAll or ioutil.ReadFile (OOM Trap).
- Must use bufio.NewScanner or bufio.NewReader for input processing.
- Must use bufio.NewWriter (or equivalent buffering) for output to reduce syscalls.
- Must avoid json.Unmarshal inside the loop if possible (using bytes primitives is preferred for speed).
- Must reduce allocations (e.g., reuse a buffer or avoid string(byteSlice) conversions).
- Output must match the original format exactly (filter for "ERROR" logs and format as [LEVEL] Message).
- Must handle lines longer than the default buffer token size (if using bufio.Scanner, handle Buffer size or use ReadLine)
- Peak memory usage must be effectively constant (O(1)) regardless of input file size.
- Must strictly adhere to the io.Reader and io.Writer interfaces provided in the signature.

## Metadata
- Programming Languages: Go (Go lan 1.18 +)
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
