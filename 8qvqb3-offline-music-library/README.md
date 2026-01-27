# 8QVQB3 - offline music library

**Category:** sft

## Overview
- Task ID: 8QVQB3
- Title: offline music library
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8qvqb3-offline-music-library

## Requirements
- The system must allow users to import and index local audio files, scanning directories and reading supported formats while handling unreadable, corrupted, or unsupported files without crashing or blocking the indexing process.
- The application must extract, normalize, and store music metadata including track title, artist, album, genre, duration, bitrate, release year, disc number, and track order, resolving inconsistent casing, whitespace, missing fields, and conflicting tag sources in a deterministic way.
- The system must store the full music library in a structured local database, ensuring persistence across reloads, browser restarts, and long-term usage without requiring any external backend or network connectivity.
- The application must detect exact and near-duplicate tracks using file hashes, metadata similarity, and duration tolerances, allowing users to review duplicates, merge entries, or mark preferred versions while preventing accidental deletion of unique files.
- The system must provide advanced filtering, sorting, and full-text search across tracks, albums, artists, genres, and custom tags, with support for compound filters, partial matches, and fast lookup even in large libraries.
- The application must allow users to assign custom tags, moods, ratings, and categories to tracks and albums, ensuring tag consistency and providing bulk editing tools for large collections.
- The system must support rule-based smart playlists, where playlists automatically update based on logical conditions such as genre filters, play count thresholds, rating ranges, recently added tracks, or listening frequency windows.
- The application must track listening history locally, logging timestamps, play durations, skips, and replays in an immutable event log to support long-term analytics and trend analysis.
- The system must generate listening analytics dashboards, including charts for most played artists, genre distribution, listening time by hour/day/week, library growth over time, and track replay frequency.
- The application must implement similarity grouping and discovery, using locally computed metadata vectors or acoustic features to cluster related tracks and allow users to explore music by sonic or stylistic closeness.
- The system must provide playlist ranking and ordering algorithms, allowing tracks to be sorted by energy level proxies, tempo estimates, listening frequency, recency, or custom scoring formulas.
- The application must support manual and automatic playlist curation, enabling users to build curated collections while also generating dynamic playlists that adapt based on listening behavior and evolving preferences.
- The system must allow users to edit and correct metadata, propagating changes consistently across albums, playlists, search indexes, and analytics views without corrupting stored state.
- The application must provide visual exploration tools, such as artist graphs, genre networks, and album relationship views, helping users navigate their music collection beyond linear lists.
- The system must implement performance optimizations including incremental indexing, debounced state updates, memoized selectors, list virtualization, and optional Web Worker processing to maintain responsiveness with very large libraries.
- The application must handle edge cases such as missing metadata, duplicate artist names, multi-artist tracks, compilation albums, renamed files, removed files, and evolving folder structures, ensuring data integrity and preventing stale references.
- The system must support exporting playlists, metadata summaries, and analytics reports in structured formats such as JSON or CSV, allowing users to back up or analyze their library externally.
- The application must provide clear, explainable logic for ranking, similarity, and playlist generation, ensuring that all automated behavior is transparent and debuggable rather than opaque.
- The system must ensure deterministic state updates and recoverability, preventing silent data corruption, preserving listening history, and maintaining consistent results across reloads and long-term use.

## Metadata
- Programming Languages: TypeScript
- Frameworks: NextJs, Tailwincss
- Libraries: zod
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
