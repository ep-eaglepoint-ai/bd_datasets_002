# 0SEXU2 - advancedPdfBufferOrchestrator

**Category:** sft

## Overview
- Task ID: 0SEXU2
- Title: advancedPdfBufferOrchestrator
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 0sexu2-advancedpdfbufferorchestrator

## Requirements
- Type Safety: Replace all 'any' types with strict TypeScript interfaces and Enums for PDF operation statuses.
- Binary Integrity: Implement a proper PDF merging strategy that preserves cross-reference tables and trailers; raw buffer concatenation is strictly forbidden.
- Memory Management: Ensure that the 'tempStorage' or any intermediate buffers are cleared after the operation to prevent OOM errors in memory-constrained environments.
- Page Range Logic: Add a feature to extract and merge only specific page ranges (e.g., '1-5, 8, 11-12') from each source PDF.
- Non-Blocking I/O: All file and buffer manipulations must be asynchronous, utilizing Promises or Streams to prevent event-loop starvation.
- Watermark Injection: Implement a layer-based watermarking feature that places text at a 45-degree angle across every page of the merged document.
- Testing (Validation): Include a test that attempts to merge a corrupted or non-PDF buffer, verifying that the system raises a specific 'InvalidDocumentError'.
- Testing (Memory): Provide a test script that processes 10 consecutive 50MB merges and asserts that the heap usage returns to baseline after completion.
- Testing (Functional): Verify that the final PDF output is readable by standard viewers and contains the correct total page count after range extraction.

## Metadata
- Programming Languages: TypeScript
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
