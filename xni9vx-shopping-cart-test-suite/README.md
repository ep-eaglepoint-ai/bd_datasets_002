# XNI9VX - Shopping Cart Test Suite

**Category:** sft

## Overview
- Task ID: XNI9VX
- Title: Shopping Cart Test Suite
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: xni9vx-shopping-cart-test-suite

## Requirements
- Cart must never contain duplicate products with the same ID. When AddToCart is called twice with id=1, the second call must be rejected and cart length must remain 1.
- Product quantity must never go below 1. When decrement is called on a product with quantity=1, the quantity must remain 1, not become 0 or negative.
- Total price must never return NaN or undefined. When product_quantity or product_price fields are missing/undefined, totalPrice calculation must return 0 or handle gracefully.
- Type coercion must not cause false matches. When cart contains product with id=1 (number), checking for id="1" (string) must not incorrectly match as duplicate.
- Rapid clicks must not corrupt state. When increment button is clicked 10 times in quick succession, final quantity must be exactly 11, not a random lower number.
- Redux state must remain immutable. After any reducer action, the original state reference must be unchanged; only a new state object should be returned.
- Delete must handle non-existent IDs safely. When handleDelete is called with an ID not in cart, function must complete without throwing errors or corrupting state.
- Quantity updates must target correct product. When cart has 3 products and increment is called on id=2, only product with id=2 must change; others remain unaffected.
- Empty cart total must be zero. When cart array is empty, totalPrice must return exactly 0, not NaN, undefined, or throw an error.
- Integration flow must maintain consistency. A sequence of add→increment→increment→decrement→delete must leave cart in correct final state at each step.
- Price precision must be maintained. When product_price=19.99 is multiplied by quantity=33, result must be 659.67 with no floating-point drift.
- Deleting last item must result in empty array. When the only item in cart is deleted, cart must become [] with length 0, not null or undefined.

## Metadata
- Programming Languages: JavaScript
- Frameworks: Jest
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
