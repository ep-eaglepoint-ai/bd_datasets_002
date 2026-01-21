# FIF45D - Pandas DataFrame Sales Analytics Pipeline Performance Fix

**Category:** sft

## Overview
- Task ID: FIF45D
- Title: Pandas DataFrame Sales Analytics Pipeline Performance Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: fif45d-pandas-dataframe-sales-analytics-pipeline-performance-fix

## Requirements
- Replace row-by-row iteration with vectorized pandas/numpy operations. Processing 100,000 rows must complete in under 60 seconds, 500,000 rows in under 5 minutes. CPU utilization must exceed 50% on multi-core servers during processing. Current implementation shows 12% CPU on 16-core server due to Python GIL-bound iterrows() loop.
- Memory consumption must stay under 2GB for 100,000 rows and under 4GB for 500,000 rows. Avoid DataFrame fragmentation from repeated loc[] assignments inside loops. Current implementation grows from 180MB to 9.2GB before OOM termination due to copy-on-write behavior with iterative modifications.
- Output row count must exactly equal input row count. Lookup tables (customer_tiers, tax_rates) contain duplicate keys from historical data migrations. When lookup tables have duplicate entries for the same key, use the FIRST occurrence only. Merge operations must not create additional rows. A 10,000-row input must produce exactly 10,000-row output.
- All monetary calculations must match legacy Excel system at exact penny-level precision. Calculate discount_amount, subtotal, tax_amount, and final_price using unrounded intermediate values. Round only when storing final values to 2 decimal places. Do not round intermediate calculation steps as this causes $0.01-$0.02 cumulative errors on approximately 15% of transactions.
- Handle missing state in transactions by defaulting to 0% tax rate. State lookup must gracefully handle states not present in tax_rates_df without raising errors or producing NaN tax amounts. Apply zero tax to transactions with unmapped states.
- Preserve original row order from input transactions DataFrame. Output rows must appear in identical order to input rows. Merge and lookup operations must not reorder rows. Identical input files processed multiple times must produce identical output order.
- Function signature must remain unchanged: calculate_discounts(transactions_df, customer_tiers_df, tax_rates_df) returning DataFrame. Return type must be pandas DataFrame with original columns plus discount_rate, discount_amount, subtotal, tax_amount, final_price. No changes to parameter names, types, or return structure.
- Output CSV schema must match existing format exactly. Columns must appear in order: order_id, customer_id, product_price, quantity, state, discount_rate, discount_amount, subtotal, tax_amount, final_price. No additional columns in output. All monetary values rounded to exactly 2 decimal places.
- No external libraries beyond pandas and numpy allowed. Do not import additional packages for optimization (numba, cython, dask, modin). Solution must work with standard pandas/numpy installation. Maintain compatibility with pandas 1.x and 2.x versions.
- Apply tier-based discount rates correctly: bronze=5%, silver=10%, gold=15%, platinum=20%. Add 5% bulk bonus for orders with quantity >= 10. Bulk bonus is additive (gold tier with quantity 15 = 15% + 5% = 20% total discount). Discount rate should not be rounded.
- Support edge cases: transactions referencing customer_ids not in lookup table, transactions referencing states not in lookup table, lookup tables with multiple entries for same key, quantities exactly equal to 10 (should receive bulk bonus), zero-quantity orders, and high-precision product prices. All edge cases must produce deterministic, correct results.

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
