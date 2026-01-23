# 39J5OX - dataset-explorer

**Category:** sft

## Overview
- Task ID: 39J5OX
- Title: dataset-explorer
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 39j5ox-dataset-explorer

## Requirements
- The system must allow users to upload CSV files via file input or drag-and-drop, parse them using a streaming approach to prevent memory spikes, and correctly handle quoted fields, embedded newlines, escaped characters, delimiters, encoding formats, missing headers, malformed rows, truncated files, and extremely large datasets. Parsing failures must produce meaningful, recoverable errors instead of breaking the application.
- The application must infer column data types such as numeric, boolean, categorical, date, and free text by sampling dataset values while tolerating mixed-type entries, null values, malformed numbers, invalid timestamps, scientific notation, and sparse fields. Users must be able to manually override inferred types, triggering re-validation and safe re-coercion without losing original raw values.
- The dataset must be rendered using virtualization to support tens or hundreds of thousands of rows without degrading UI performance. The table must support sorting, resizing, reordering, column pinning, row indexing, and responsive layout adjustments while preventing layout thrashing, rendering bottlenecks, or scroll performance issues.
- Users must be able to filter data using substring search, numeric comparisons, date ranges, category filters, regex-based matching, and compound logical expressions. Filtering must remain deterministic, composable, and performant, correctly handling empty result sets, contradictory filters, invalid query syntax, and extreme dataset sizes.
- The system must support renaming columns, trimming and normalizing text, performing regex-based replacements, splitting and merging fields, casting types, computing new derived columns via arithmetic or mapping rules, and applying transformations in a non-destructive pipeline. Invalid formulas, divide-by-zero errors, null propagation, transformation conflicts, and irreversible operations must be safely detected and handled.
- The application must compute descriptive statistics such as count, sum, mean, median, min, max, standard deviation, frequency distributions, and group-by aggregations while maintaining numerical accuracy and stability in the presence of NaN values, missing fields, large numeric magnitudes, floating-point precision limits, and empty aggregation groups.
- Users must be able to generate responsive charts including bar charts, line charts, scatter plots, histograms, box plots, heatmaps, and correlation matrices using visualization libraries such as Chart.js, Recharts, Vega-Lite, D3.js, or ECharts. Visualizations must dynamically update when filters, transformations, or dataset states change, and must gracefully handle empty datasets, extreme value ranges, invalid axis mappings, and mismatched data dimensions.
- The system must automatically compute column-level profiling insights such as value distributions, cardinality, missing-value rates, min/max ranges, unique counts, and detected anomalies. Profiling must remain accurate even under sparse, skewed, or highly irregular datasets.
- Every transformation, filter, schema override, and dataset mutation must create an immutable snapshot, allowing users to undo and redo changes, restore previous dataset states, and compare dataset versions. The versioning system must remain stable across deep edit histories, schema mutations, browser reloads, and long-running sessions.
- Users must be able to export processed datasets to CSV and JSON while preserving column ordering, numeric precision, encoding correctness, transformation history, and schema integrity. The export pipeline must handle empty datasets, very large exports, delimiter collisions, special characters, and datasets that differ structurally from their original input.
- The entire application must operate without internet connectivity and persist dataset state, transformation pipelines, visualization configurations, and user sessions using IndexedDB or equivalent browser storage. The system must recover safely from corrupted storage, interrupted sessions, partial writes, browser refreshes, and stale cache states without losing user work.
- The system must avoid unnecessary full-dataset copies, batch expensive computations, stream data processing when possible, and optionally offload heavy analytics to Web Workers to maintain UI responsiveness. The application must remain usable on lower-end devices and gracefully degrade under memory or compute constraints.
- All dataset inputs, transformations, filter expressions, export operations, and internal state transitions must be validated using Zod to prevent invalid data propagation. Errors must be surfaced clearly to the user, silent corruption must be prevented, and deterministic behavior must be guaranteed even under malformed or adversarial input.
- Application state must follow predictable and debuggable update patterns using Zustand, Redux, or an equivalent state manager to ensure that dataset changes, transformations, filters, and visualization updates remain consistent, race-condition-free, and reproducible across sessions.
- The UI must be built with TailwindCSS, remain fully responsive, keyboard-navigable, and accessible, and clearly communicate processing states such as loading, parsing, filtering, transforming, exporting, and error conditions without overwhelming or confusing the user.
- The system must be testable against massive CSV files, corrupted datasets, malformed rows, extreme transformation pipelines, repeated undo/redo cycles, precision-sensitive numeric operations, export validation scenarios, and UI stress conditions to ensure long-term stability, correctness, and professional-grade reliability.

## Metadata
- Programming Languages: Typescript
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
