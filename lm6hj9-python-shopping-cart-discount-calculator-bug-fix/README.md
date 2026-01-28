# LM6HJ9 - Python Shopping Cart Discount Calculator Bug Fix

**Category:** sft

## Overview
- Task ID: LM6HJ9
- Title: Python Shopping Cart Discount Calculator Bug Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: lm6hj9-python-shopping-cart-discount-calculator-bug-fix

## Requirements
- Fix discount application order: fixed amount discounts must be applied BEFORE percentage discounts. The _apply_discounts method processes them in wrong order.
- Fix remove_item method: when quantity becomes zero or negative, the item must be automatically deleted from self.items dictionary.
- Fix subtotal not updating after remove_item: the method must call _calculate_subtotal() after modifying items.
- Fix discount code reuse: the ShoppingCart._used_codes set is local to the cart, but DiscountCodeManager tracks globally. The apply_discount method must check DiscountCodeManager.is_code_available() before allowing application.
- Fix negative total: in _apply_discounts, if discounts exceed the amount, return Decimal("0") instead of negative value. Add max(discounted, Decimal("0")) check.
- Fix BOGO calculation: in _apply_bogo_deals, add explicit check that item.quantity >= 2 before calculating free items. Currently works mathematically but is unclear.
- Fix intermediate rounding: the _apply_discounts method must NOT round after each discount. Accumulate all discount reductions first, then round only the final discounted amount once.
- Fix discount codes not marked as used: after successful apply_discount or checkout, the code must be marked in DiscountCodeManager using mark_code_used(customer_id, code).
- Add validation to add_item: reject quantity <= 0 by returning early without modifying cart.
- Fix return type precision: calculate_total converts Decimal to float which loses precision. Consider returning Decimal values or ensure proper rounding before float conversion.
- Verify BOGO savings calculation doesn't produce negative savings values.
- Ensure clear() method also clears _used_codes if it exists, to reset cart state completely.

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
