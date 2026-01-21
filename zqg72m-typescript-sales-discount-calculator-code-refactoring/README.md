# ZQG72M - TypeScript Sales Discount Calculator Code Refactoring

**Category:** sft

## Overview
- Task ID: ZQG72M
- Title: TypeScript Sales Discount Calculator Code Refactoring
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: zqg72m-typescript-sales-discount-calculator-code-refactoring

## Requirements
- Replace all any types with proper TypeScript interfaces. Define Transaction, Customer, TaxRate, and ProcessedTransaction interfaces with explicit property types including union types for fields that may be string or number. No any, unknown, or implicit any allowed in final code. ESLint must report zero any-type warnings.
- Refactor the monolithic processAllSales function into smaller single-responsibility functions. Each function should handle one task: lookup customer tier, calculate discount rate, calculate tax, round monetary values. Functions should be pure where possible with no side effects.
- Convert callback-style API to Promise-based async/await pattern. The main function should return Promise<ProcessedTransaction[]>. Maintain backward compatibility by keeping callback version as wrapper or providing both APIs.
- Extract hardcoded discount rates (0.20, 0.15, 0.10, 0.05) and bulk threshold (10) into named constants or configuration object. Values should be easily changeable without modifying business logic code. Use descriptive constant names.
- Preserve original lookup behavior exactly. When lookup tables contain duplicate keys, the behavior must match original code which iterates through entire array without breaking. Missing customer_id defaults to bronze tier. Missing state defaults to 0% tax rate.
- Preserve original equality comparison behavior. The original code uses loose equality (==) for customer_id and state matching which handles type coercion between strings and numbers. Refactored code must produce identical results when input data contains mixed types.
- Preserve original rounding behavior exactly. Round monetary values (discount_amount, subtotal, tax_amount, final_price) to 2 decimal places using Math.round(value * 100) / 100 approach. Calculate all values using unrounded intermediates then round only final stored values.
- Output row count must equal input row count exactly. Refactored code must produce one output record per input transaction with no filtering, deduplication, or row multiplication during processing.
- Reduce cyclomatic complexity to under 10 per function. No nested loops deeper than 1 level. Each function should have clear entry and exit points with minimal branching logic.
- Structure code for testability. Functions should accept dependencies as parameters rather than accessing globals. Lookup functions should be injectable for unit testing. Preserve original error handling behavior where errors are passed to callback or reject Promise.

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
