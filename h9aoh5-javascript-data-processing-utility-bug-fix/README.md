# H9AOH5 - JavaScript Data Processing Utility Bug Fix

**Category:** sft

## Overview
- Task ID: H9AOH5
- Title: JavaScript Data Processing Utility Bug Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: h9aoh5-javascript-data-processing-utility-bug-fix

## Requirements
- Fix dedupe mutation bug: the main dedupe method uses splice() which modifies the original input array. Must return a new array without touching the input.
- Fix the splice-in-loop bug: using splice while iterating causes index shifting, resulting in skipped elements. Array [1,2,2,3,2] returns [1,2,3,2] instead of [1,2,3].
- Fix comparison operator in dedupe: uses loose equality (==) instead of strict (===). This causes "1" and 1 to be treated as duplicates when they shouldn't be.
- Fix NaN handling in dedupe: NaN !== NaN in JavaScript, so NaN values are never detected as duplicates. Need special handling with Number.isNaN() or Object.is().
- Fix _dedupeByKey with null/undefined keys: using object property seen[value] treats null and undefined as the same key ("null" and "undefined" strings). Use Map instead.
- Fix merge not being fully immutable: the merged array contains shallow copies, but nested objects still reference the original. Implement deep cloning for nested objects or document the limitation.
- Fix date comparison in filter: the $between operator receives string dates but compares them as strings instead of converting to Date objects first. "2024-01-15" > "2024-01-02" works but "2024-1-15" > "2024-12-02" fails.
- Fix aggregation sum/avg with empty array: calling reduce() on empty values array throws "Reduce of empty array with no initial value". Add initial value of 0.
- Fix aggregation grouping with null/undefined keys: items with null groupBy value create string key "null" which collides with actual string "null". Use Map or symbol-based keys.
- Fix type coercion in _matchesCondition: uses == instead of === for $eq and $ne comparisons, causing type coercion bugs.
- Fix transform $rename when field doesn't exist: if the source field is undefined, $rename should handle gracefully instead of creating undefined property on renamed key.
- Fix validator not checking for NaN: a value of NaN passes the number type check since typeof NaN === 'number'. Add Number.isNaN() check for numeric fields.

## Metadata
- Programming Languages: Javascript
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
