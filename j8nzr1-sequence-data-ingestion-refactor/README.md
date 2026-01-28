# J8NZR1 - sequence-Data-Ingestion-Refactor

**Category:** sft

## Overview
- Task ID: J8NZR1
- Title: sequence-Data-Ingestion-Refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: j8nzr1-sequence-data-ingestion-refactor

## Requirements
- Modular Parsing Architecture: Extract the format-specific logic (FASTQ vs FASTA) into separate, interchangeable parser classes that implement a standard 'ISequenceParser' interface.
- Atomic Error Recovery: Refactor the main loop to use a per-record error boundary; the system must identify, count, and log malformed lines without halting the processing of the entire file.
- Buffer Management: Implement a consistent batch-flush mechanism (e.g., every 500 records) to manage the application's memory footprint, ensuring 2GB+ files can be processed in a limited heap.
- Context Enrichment: Ensure all metadata extraction rules (sequencer_id injection for FASTQ, timestamps for FASTA) are preserved in the new modular implementations.
- Type Integrity: Replace dictionary-based record-tracking with explicit data models or typed classes to prevent runtime 'KeyError' exceptions in downstream analytics services.
- Testing Requirement: Write a test where a 'FASTQ' file contains a corrupted 3-line record in the middle of a 1000-record set; verify that 999 records are saved and one specific error is logged.
- Testing Requirement: Provide a validation test verifying that passing an unknown extension (e.g., .LOG) results in an 'UnsupportedFormatError' and zero database interactions.
- Testing Requirement: Demonstrate the performance impact of the refactor by processing a file with alternating empty lines and ensuring no redundant IO or CPU cycles are consumed.

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
