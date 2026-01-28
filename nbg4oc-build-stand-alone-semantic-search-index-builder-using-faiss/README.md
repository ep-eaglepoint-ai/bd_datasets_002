# NBG4OC - Build Stand-Alone Semantic Search Index Builder Using FAISS

**Category:** sft

## Overview
- Task ID: NBG4OC
- Title: Build Stand-Alone Semantic Search Index Builder Using FAISS
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: nbg4oc-build-stand-alone-semantic-search-index-builder-using-faiss

## Requirements
- Accept a JSONL input file where each line contains a JSON object with a required "text" field.
- Generate embeddings using a Sentence Transformers model.
- Normalize embeddings to enable cosine similarity search.
- Build a FAISS IndexFlatIP index from the embeddings.
- Persist the FAISS index to disk.
- Store the original JSON records in a separate metadata JSONL file.
- Allow configuration of the embedding model via CLI argument and environment variable.
- Automatically create output directories if they do not exist.

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
