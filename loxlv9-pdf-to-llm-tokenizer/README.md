# LOXLV9 - PDF-to-LLM tokenizer

**Category:** sft

## Overview
- Task ID: LOXLV9
- Title: PDF-to-LLM tokenizer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: loxlv9-pdf-to-llm-tokenizer

## Requirements
- Implementation is written entirely in Python
- Code is modular (separate functions for extraction, tokenization, chunking)
- Can be used as an importable function
- Can be executed as a CLI tool without code changes
- Successfully reads multi-page PDFs
- Gracefully handles empty pages or pages with no extractable text
- Does not crash on malformed or partially corrupted PDFs
- Preserves page order during text extraction
- Normalizes excessive whitespace deterministically
- Does not alter semantic content (no summarization or rewriting)
- Produces identical output for identical input PDFs
- Uses true LLM tokenization, not word or character counts
- Uses a supported encoding (e.g., o200k_base)
- Token count is derived from encoding the entire document text
- No heuristic or estimated token counts are used
- Reports a single authoritative document token count
- Chunks are created strictly by token count, not characters
- Maximum tokens per chunk is configurable
- Token overlap between chunks is configurable
- Chunks are sequential and non-reordered

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
