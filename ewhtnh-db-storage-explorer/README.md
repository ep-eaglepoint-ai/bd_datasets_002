# EWHTNH - db-storage-explorer

**Category:** sft

## Overview
- Task ID: EWHTNH
- Title: db-storage-explorer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: ewhtnh-db-storage-explorer

## Requirements
- The system must allow users to import and parse local database storage snapshots, such as binary page dumps or structured JSON representations, while validating file structure and gracefully handling corrupted, incomplete, or unsupported formats without crashing.
- The application must decode and visualize heap page layouts, displaying page headers, tuple slots, free space regions, line pointers, and row storage offsets in a deterministic and reproducible manner.
- The system must provide row-level tuple inspection, allowing users to view tuple headers, visibility flags, transaction IDs, null bitmaps, and stored column values while ensuring that malformed tuple data does not break rendering or corrupt inspection state.
- The application must support index page visualization, including B-Tree or similar index structures, displaying internal nodes, leaf nodes, key ranges, child pointers, and page split history where available.
- The system must compute and display storage fragmentation metrics, measuring dead tuple ratios, free-space scatter, page fill factors, wasted byte percentages, and fragmentation growth trends over time.
- The application must track page occupancy and density, visualizing how full each page is and highlighting underutilized or overfilled pages to support storage efficiency analysis.
- The system must provide free space map exploration, allowing users to inspect how the storage engine tracks reusable space and identify allocation inefficiencies or fragmentation patterns.
- The application must implement historical storage state comparison, enabling users to load multiple snapshots and visualize how page layouts, tuple distribution, and fragmentation evolve across time.
- The system must detect and flag dead tuples, orphaned rows, unreachable pages, and stale index entries, explaining why each artifact exists and how it impacts storage health.
- The application must generate storage efficiency analytics, including table bloat estimates, index bloat estimates, wasted disk space ratios, row density trends, and projected compaction benefits.
- The system must visualize page-level heatmaps, showing access frequency proxies, modification density, and storage churn to help users understand write hotspots and unstable regions.
- The application must support binary-level inspection tools, allowing advanced users to view raw hex dumps, decoded byte ranges, field offsets, and structured interpretations of page contents.
- The system must allow users to simulate storage operations, such as inserts, updates, deletes, vacuuming, and compaction, and visualize how these operations would modify page layouts and free space maps.
- The application must implement index depth and fanout analysis, computing tree height, branching factors, page utilization rates, and lookup cost estimations based on index structure.
- The system must provide tuple lifecycle visualization, showing how rows transition between visible, dead, frozen, or reused states across transactions or cleanup operations.
- The application must support search and filtering across pages and tuples, allowing users to locate specific records, transaction IDs, storage offsets, or anomaly patterns efficiently.
- The system must maintain immutable inspection logs, recording parsed snapshots, decoding steps, error states, and derived metrics to ensure reproducibility and auditability of results.
- The application must implement performance optimizations such as chunked parsing, incremental decoding, memoized computation of storage metrics, list virtualization, and optional Web Worker execution to handle large datasets smoothly.
- The system must handle edge cases such as corrupted pages, partially overwritten data, mismatched index references, deleted tables, inconsistent metadata, and invalid pointer chains without crashing or producing misleading results.
- The application must ensure deterministic decoding and explainable storage metrics, allowing users to verify calculations for page density, fragmentation, bloat estimation, tuple visibility, and index depth rather than relying on opaque heuristics.

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
