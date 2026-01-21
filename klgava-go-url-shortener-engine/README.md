# KLGAVA - Go URL Shortener Engine

**Category:** sft

## Overview
- Task ID: KLGAVA
- Title: Go URL Shortener Engine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: klgava-go-url-shortener-engine

## Requirements
- Thread Safety: Implement synchronization primitives to support 10,000+ concurrent R/W operations without data races.
- Collision Resolution: Develop a deterministic mechanism to handle cases where different URLs produce identical hashes.
- Encoding Optimization: Transition from Hex-MD5 to a compact 7-character Base62 (Alphanumeric) encoding strategy.
- Input Integrity: Enforce strict validation to ensure only well-formed absolute URLs are ingested.
- Performance: Maintain O(1) average time complexity for both the Shorten and Resolve operations.
- Concurrency Validation: Implement a stress test using the Go Race Detector and 10,000+ concurrent goroutines to prove zero data races under heavy R/W load.
- Collision Integrity Test: Provide a unit test demonstrating that two different URLs producing the same initial hash are correctly assigned distinct, unique short keys without data loss.
- Validation Coverage: Include a suite of positive and negative test cases to verify the rejection of malformed, relative, or unsafe URLs.

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
