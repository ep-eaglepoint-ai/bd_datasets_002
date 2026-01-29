# EAQG1V - Python Inventory Management System - Stock Tracking Bug Fix

**Category:** sft

## Overview
- Task ID: EAQG1V
- Title: Python Inventory Management System - Stock Tracking Bug Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: eaqg1v-python-inventory-management-system-stock-tracking-bug-fix

## Requirements
- Stock removal must validate available quantity BEFORE decrementing, not after. The buggy code decrements first then caps to zero, allowing "successful" removal when stock is insufficient. To verify: call remove_stock(10) when stock is 5 - it must return False and stock must remain 5, not become 0.
- All monetary calculations must use Decimal type instead of float to prevent rounding errors. The buggy code uses float arithmetic causing drift (0.1 + 0.2 != 0.3). To verify: add 1000 items priced at $0.10 each - total value must be exactly $100.00, not $99.99999 or $100.00001.
- Reorder threshold check must use <= (less than or equal) not < (less than). The buggy code triggers reorder when stock < threshold, but requirement is to alert when stock reaches threshold. To verify: if threshold is 10, alert must trigger when stock becomes 10, not 9.
- Transaction objects must be created as new instances for each log entry, not reused. The buggy code modifies and reappends the same object, corrupting history. To verify: log two transactions, modify first returned transaction - second transaction in history must be unchanged.
- SKU lookups must normalize case and whitespace for consistent matching. The buggy code uses string concatenation causing "SKU-001" vs "sku-001" vs " SKU-001 " to fail. To verify: get_stock("sku-001") must return same result as get_stock("SKU-001") and get_stock(" sku-001 ").
- All stock operations must use thread locking to prevent race conditions. The buggy code has no synchronization, causing data loss under concurrent access. To verify: run 100 concurrent add_stock(1) operations - final stock must be exactly initial + 100.
- The remove_stock method must return False when quantity exceeds available stock. The buggy code returns True even when it caps removal to available amount. To verify: remove_stock(10) when stock is 5 must return False (not True with partial removal).
- Bulk operations must be atomic - validate all items first, then apply all or none. The buggy code applies removals one by one, leaving partial state on failure. To verify: bulk_remove with one invalid SKU must leave all stock unchanged.
- The get_total_value method must return Decimal("0.00") for empty inventory without error. The buggy code may raise ZeroDivisionError or return NaN. To verify: call get_total_value() on new empty Inventory - must return 0.00.
- Stock quantity parameters must be validated as positive integers. The buggy code accepts negative numbers and floats. To verify: add_stock(sku, -5) and add_stock(sku, 2.5) must raise ValueError or return False.
- The check_reorder method must return ALL items at or below threshold, not just the first. The buggy code uses early return after finding first match. To verify: with 3 items below threshold, check_reorder() must return list of 3 products.
- Transaction timestamps must be set at Transaction object creation time, not when added to log. The buggy code sets timestamp in log_transaction method. To verify: create transaction, wait 1 second, add to log - timestamp must reflect creation time, not logging time.

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
