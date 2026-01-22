# 5CD1IB - file organizer

**Category:** sft

## Overview
- Task ID: 5CD1IB
- Title: file organizer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5cd1ib-file-organizer

## Requirements
- The application must allow users to select and scan local directories, recursively traversing nested folders to index files while handling deeply nested paths, symbolic links, extremely large directory trees, permission-restricted folders, hidden/system files, and directories that change during scanning.
- The system must index and store file metadata, including filename, extension, size, creation time, modification time, file path, and type, ensuring that metadata remains consistent even when files are renamed, moved, deleted, or replaced after indexing, and handling cases where metadata becomes stale or partially corrupted.
- The app must support incremental re-scanning, meaning it should update only changed files rather than re-indexing everything, while correctly detecting added files, removed files, modified timestamps, replaced content, and renamed files without duplicating records.
- Users must be able to assign, edit, and remove tags for files, allowing flexible categorization while preventing duplicate tags, handling empty or invalid tag names, maintaining tag consistency across renamed or moved files, and ensuring tags persist even when files temporarily become unavailable
- The system must support fast searching and filtering using file metadata, allowing queries by filename, extension, size range, tags, date modified, and directory location, while handling partial matches, case sensitivity rules, empty queries, very large result sets, and ensuring search remains responsive even with tens or hundreds of thousands of indexed files.
- The application must detect duplicate files using hashing or content-based signatures, ensuring that identical files are grouped correctly even if filenames differ, while handling extremely large files efficiently, avoiding excessive memory usage, detecting partial duplicates where applicable, and handling cases where files change after hashes are computed.
- The system must allow users to review and manage detected duplicates, including previewing file metadata and deciding whether to delete, ignore, or keep copies, while preventing accidental deletion of important system files, handling locked or in-use files, and safely recovering from failed delete operations.
- The app must store all indexed data locally, using a local database or structured storage layer, ensuring persistence across restarts, protecting against partial writes, handling unexpected shutdowns without corrupting index state, and supporting schema evolution without breaking previously stored records.
- The system must remain performant under large-scale file counts, ensuring UI rendering does not degrade when listing thousands of files, implementing pagination or virtualization where necessary, handling memory constraints, and avoiding blocking the main thread during long-running scans or hash computations.
- The application must gracefully handle filesystem volatility, including files being created, deleted, renamed, or modified while scans or searches are running, preventing crashes, race conditions, inconsistent UI state, or stale references.
- The UI must provide a clear and responsive file browsing experience, including sortable lists, filters, previews, and bulk operations, while handling empty states, slow-loading datasets, extremely long filenames, unusual characters, and layout stability across screen sizes.
- The system must include robust error handling and user feedback, clearly surfacing issues such as permission denials, missing files, failed reads, interrupted scans, and corrupted metadata, while preventing silent failures and ensuring recoverable errors do not break the overall application state.
- The application must be designed with predictable and deterministic behavior, ensuring that repeated scans produce consistent results, duplicate detection yields stable groupings, sorting remains reproducible, and state transitions do not depend on nondeterministic filesystem timing.
- The system must support safe destructive operations, such as file deletion or moving, by requiring explicit confirmation, supporting dry-run previews, preventing deletion of protected paths, and ensuring recovery paths exist when operations fail midway.
- The overall architecture must prioritize maintainability, modularity, and scalability, ensuring scanning logic, indexing, search, duplicate detection, and UI layers are cleanly separated, testable, and extensible for future features such as content previewing, smart grouping, or automation rules.

## Metadata
- Programming Languages: TypeScript
- Frameworks: Nextjs
- Libraries: Tailwindcss
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
