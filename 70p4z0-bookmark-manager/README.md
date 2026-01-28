# 70P4Z0 - bookmark manager

**Category:** sft

## Overview
- Task ID: 70P4Z0
- Title: bookmark manager
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 70p4z0-bookmark-manager

## Requirements
- The application must validate and normalize URLs, ensuring consistent formatting, preventing invalid protocols, handling missing schemes, and safely storing unusual or edge-case URLs without breaking the system.
- The system must persist all bookmark data locally using IndexedDB or localStorage, ensuring full offline functionality, consistent state across reloads, and long-term data durability without relying on external APIs.
- The application must support a tagging system, allowing users to create, rename, merge, delete, and assign tags to bookmarks while preventing tag duplication, inconsistent casing, or orphaned tag references.
- The system must allow users to group bookmarks into collections or folders, enabling logical organization and fast navigation across large bookmark libraries.
- The application must provide advanced search functionality, supporting keyword search across titles, URLs, descriptions, tags, and notes, with fast response times even for large bookmark datasets.
- The system must allow users to create, edit, and delete bookmarks, storing structured data such as URL, title, description, tags, creation date, last visited date, favorite status, and optional notes while validating all input using Zod to prevent malformed or invalid entries.
- The system must support sorting and filtering, allowing users to sort bookmarks by date added, last visited, title, domain, favorite status, or custom criteria while supporting compound filters such as tag + favorite + date range.
- The application must allow users to mark bookmarks as favorites, ensuring favorite state is stored persistently and reflected consistently across all views, filters, and exports.
- The system must support duplicate bookmark detection, identifying repeated URLs or near-duplicate entries and allowing users to merge, delete, or retain duplicates without accidental data loss.
- The application must track bookmark interaction history, recording visit timestamps, click counts, and recency data to support usage analytics and ranking features.
- The system must generate bookmark analytics dashboards, including statistics such as most visited links, frequently saved domains, tag distribution, bookmarking trends over time, and favorite usage patterns.
- The application must allow users to edit bookmark metadata, including title overrides, custom descriptions, notes, and tag adjustments, ensuring changes propagate consistently across search indexes and collections.
- The system must support bulk operations, enabling users to import, export, tag, delete, or reorganize multiple bookmarks at once while ensuring atomic updates and rollback-safe behavior in case of partial failures.
- The application must support bookmark import and export, allowing users to back up or restore bookmark data in formats such as JSON or CSV without corrupting existing entries.
- The system must handle edge cases such as invalid URLs, unreachable domains, renamed tags, deleted collections, duplicate titles, malformed stored data, and extremely large bookmark libraries without crashing or producing inconsistent results.
- The application must implement performance optimizations, including memoized selectors, debounced search input, incremental filtering, list virtualization for large bookmark lists, and batched state updates to ensure smooth interaction at scale.
- The system must ensure deterministic state updates and data consistency, preventing silent drift in bookmark ordering, tag counts, or analytics metrics across reloads or long-term usage.

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
