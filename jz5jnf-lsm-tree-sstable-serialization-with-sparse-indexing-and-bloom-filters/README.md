# JZ5JNF - LSM-Tree SSTable Serialization with Sparse Indexing and Bloom Filters

**Category:** sft

## Overview
- Task ID: JZ5JNF
- Title: LSM-Tree SSTable Serialization with Sparse Indexing and Bloom Filters
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: jz5jnf-lsm-tree-sstable-serialization-with-sparse-indexing-and-bloom-filters

## Requirements
- The output file must strictly follow the [KeyLen][Key][ValLen][Val] pattern. Using JSON or CSV output is an automatic failure.
- The index must not contain every key. It must strictly sample every Nth key. If the index map is size N (where N is total keys), it fails the memory constraint.
- Footer Implementation: The file must end with the pointers (offsets) to the Bloom Filter and Index. Without this, the file is unreadable
- Must implement a bitset (using []byte or []uint64) and bitwise operators. Using a map for the bloom filter is a conceptual failure.
- Usage of bufio.Writer is required for performance. Writing 1 byte at a time directly to os.File is a failure
- Must use binary.LittleEndian (or Big) consistently for all length/offset integers. Mixing them is a failure.
- The recorded offsets in the Sparse Index must point to the beginning of the length prefix of the record, not the middle of the data.
- Concurrency Safety: The MemTable read (during flush) must be protected by a Read Lock (RLock), assuming the MemTable handles concurrent writes.

## Metadata
- Programming Languages: Go (GoLang)
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
