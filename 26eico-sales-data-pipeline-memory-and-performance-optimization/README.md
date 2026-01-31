# 26EICO - Sales Data Pipeline Memory and Performance Optimization

**Category:** sft

## Overview
- Task ID: 26EICO
- Title: Sales Data Pipeline Memory and Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 26eico-sales-data-pipeline-memory-and-performance-optimization

## Requirements
- Replace the single pd.read_csv() call with chunked iteration using the chunksize parameter. Default to 100,000-500,000 rows per chunk, configurable via constant. Verify that at no point does the code call list() on the chunk iterator or accumulate all chunks in a list, which would defeat the memory savings. The chunk iterator must be consumed lazily.
- Implement incremental aggregation that updates running totals as each chunk is processed, then finalizes results after all chunks complete. For grouped metrics (e.g., revenue by store-category-date), maintain a dictionary of partial sums that accumulates across chunks. Verify by checking that intermediate aggregate storage uses O(unique_groups) memory, not O(total_rows).
- Replace all df.apply(lambda row: ..., axis=1) calls with vectorized pandas/numpy operations. Revenue calculation must be quantity * unit_price * (1 - discount/100) as a single vectorized expression. Verify by searching the codebase for apply( with axis=1 and confirming none exist in production code paths.
- Use appropriate dtypes to reduce memory footprint: category for low-cardinality string columns (store_id, region, payment_method), int32 instead of int64 for IDs and quantities, float64 (not float32) for monetary calculations to preserve checksum precision. Verify by calling df.memory_usage(deep=True) and confirming categorical columns show significant reduction.
- The pipeline must complete with peak memory usage under 4GB when processing the full 5GB/50M-row dataset. Use tracemalloc or process RSS monitoring to measure. Verify with the provided benchmark.py script that reports peak memory and fails if threshold exceeded.
- The optimized pipeline must complete in under 5 minutes (300 seconds) for the full dataset. The benchmark script must measure wall-clock time from start to database export completion. Verify by running benchmark.py which fails if time limit exceeded.
- Display a progress bar using tqdm that shows: current chunk number or row count, percentage complete, elapsed time, and estimated time remaining. The total must be calculated upfront (count lines or estimate from file size). Verify by running the pipeline and observing the progress bar updates smoothly with reasonable ETA.
- Log malformed or invalid rows to a file (malformed_rows.log) including the original line number in the source CSV, the error reason, and optionally the raw row data. The pipeline must not crash on bad data—skip the row and continue. Verify by inserting test rows with invalid data (negative quantity, malformed date) and checking they appear in the log with correct line numbers.
- The optimized pipeline must produce aggregation results identical to the original slow implementation. Compute a deterministic checksum (e.g., MD5 of sorted CSV export) for each output table. Verify by running both implementations on a test dataset and comparing checksums—they must match exactly.
- Database exports must respect a 10-connection limit using SQLAlchemy's connection pooling (pool_size + max_overflow ≤ 10). Use batch inserts with method='multi' and appropriate chunksize for efficient writes. Verify by monitoring PostgreSQL's pg_stat_activity during export and confirming connection count never exceeds 10.
- Average discount in store-category aggregates must be quantity-weighted: sum(discount * quantity) / sum(quantity), not simple mean(discount). Track both the weighted sum and total quantity across chunks, compute final average only during finalization. Verify by manually calculating expected average for a test case and comparing to pipeline output.
- Explicitly delete processed chunk DataFrames and call gc.collect() after each chunk to prevent memory fragmentation. Verify by monitoring memory usage across chunk processing—it should remain relatively stable rather than growing linearly with chunks processed.

## Metadata
- Programming Languages: Python
- Frameworks: (none)
- Libraries: Pandas , Numpy
- Databases: Postgress
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
