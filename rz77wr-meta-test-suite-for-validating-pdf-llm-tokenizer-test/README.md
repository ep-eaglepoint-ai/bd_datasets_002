# RZ77WR - Meta-Test Suite for Validating PDF LLM Tokenizer Test

**Category:** sft

## Overview
- Task ID: RZ77WR
- Title: Meta-Test Suite for Validating PDF LLM Tokenizer Test
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: rz77wr-meta-test-suite-for-validating-pdf-llm-tokenizer-test

## Requirements
- Meta-tests are written in Python using pytest
- Meta-tests target the test suite, not the tokenizer implementation directly
- Meta-tests do not duplicate the original functional tests
- Verify that tests exist for PDF extraction, tokenization, chunking, JSON output, error handling, and CLI execution
- Assert that removing or bypassing any major tokenizer behavior would cause at least one test to fail
- Confirm that edge cases (empty pages, invalid parameters) are covered by tests
- Ensure the test suite validates determinism (same input → same output)
- Ensure document token count accuracy is explicitly tested
- Ensure chunk boundary and overlap logic is meaningfully exercised
- Confirm JSON serialization and deserialization are validated
- Meta-tests intentionally simulate broken or altered tokenizer behaviors and confirm the test suite detects them
- Meta-tests do not require external services or network access
- Meta-tests produce consistent results across repeated runs

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
