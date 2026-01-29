# GTMTD9 - restaurantSplitBillTestGrid

**Category:** sft

## Overview
- Task ID: GTMTD9
- Title: restaurantSplitBillTestGrid
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: gtmtd9-restaurantsplitbilltestgrid

## Requirements
- Penny-Perfect Reconciliation: Implement a test scenario for a $100.00 bill split 3 ways with 10% tax and 15% tip. Your test must verify that the sum of the returned array precisely matches the total calculated amount (126.50) without a single cent of deviation.
- Remainder Allocation Check: Specifically verify that if there is a mathematical remainder (e.g., 10 divided by 3), the 'extra' penny is assigned exclusively to the first index (`result[0]`) and not distributed as a fraction of a cent.
- Percentage Boundary Validation: Write tests to ensure that 0% tax and 0% tip are handled correctly without returning NaN or zero values for the whole bill.
- Invalid Input Resilience: Test the function's response to an invalid number of people (0 or -1). The suite should assert that the function returns an empty array or throws a specific domain error, rather than attempting to divide by zero.
- Floating-Point Error Prevention: Create a 'High Volume' test with multiple varying amounts (e.g., $19.99, $4.32) and ensure that `Math.round` or the cent-conversion logic within the provided code correctly avoids standard JavaScript floating-point 'leakage' (like 0.30000000000000004).
- Testing Requirement (Happy Path): Verify a standard $60.00 bill for 4 people with 0% tax/tip results in exactly four entries of 15.00.
- Testing Requirement (Lead Payer Logic): Confirm that in a $0.05 bill split among 3 people, the first person pays 0.03 and the other two pay 0.01 each.
- Code Coverage Goal: Achieve 100% statement and branch coverage to ensure every line of the rounding and remainder-allocation logic is executed by the test suite.

## Metadata
- Programming Languages: JavaScript
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
