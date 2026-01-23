# 05WXOV - Comprehensive Pytest Suite for calculate_discount

**Category:** sft

## Overview
- Task ID: 05WXOV
- Title: Comprehensive Pytest Suite for calculate_discount
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 05wxov-comprehensive-pytest-suite-for-calculate-discount

## Requirements
- Tests must be written using pytest only
- Exhaustively cover discount tier boundaries exactly at, just below, and just above all thresholds
- Explicitly include quantities: 0, 1, 50, 51, 100, 101
- Include invalid/adversarial inputs: negative quantity, negative price, extremely large prices/quantities, coupon code without repository
- Coupon coverage must include: expired coupons, coupon value exceeding subtotal, minimum subtotal requirement, stackable vs non-stackable, coupon with and without bulk discount present
- Assert rounding and precision explicitly, including half-cent rounding case
- Prove rounding errors do not accumulate across calculation steps
- Use fake/mock CouponRepository to isolate dependencies
- Enforce invariants: total is never negative, total never exceeds subtotal, coupon discount never exceeds post-bulk subtotal
- All expected failures must assert exception type and message explicitly

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
