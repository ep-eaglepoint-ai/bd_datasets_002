# 0U26J2 - DiscountResolutionEngine

**Category:** sft

## Overview
- Task ID: 0U26J2
- Title: DiscountResolutionEngine
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 0u26j2-discountresolutionengine

## Requirements
- Rule Dependency Resolution: Implement a mechanism to evaluate discount rules as a Directed Acyclic Graph (DAG). The engine must detect and reject any circular dependencies in the rule definitions during the initialization phase.
- Financial Precision: All currency-related calculations must use a fixed-point or Decimal representation to prevent rounding errors associated with floating-point math. All intermediate results must be rounded according to standard ISO-4217 currency rules."
- Conflict & Pruning Logic: Support 'Exclusive' rules that, when triggered, terminate further evaluation of sub-branches in the discount graph. 'Stackable' rules must be evaluated in a deterministic order defined by their priority and dependency tier.
- Traceability Metadata: The engine must return a 'CalculationManifest' with every price, detailing the entry price, every rule applied (in order), the delta each rule introduced, and the final exit price.
- Performance & Scalability: The core evaluation logic must be thread-safe and stateless, achieving a P99 latency of < 5ms for a cart of 100 items against a graph of 200 active rules.
- Idempotent Simulation: Implement a 'Shadow Evaluation' mode where the engine accepts a 'SnapshotDate' to retrieve and apply rules as they existed at a specific point in time against historical cart payloads.
- Testing (Unit): Create a test case where a 'Buy 2 Get 1' rule and a '15% Seasonal Discount' rule interact, verifying that the order of application produces the mathematically correct discounted total.
- esting (Adversarial): Construct a rule graph with 500 nodes and intentional deep nesting (50+ levels) to verify that the engine resolves the price without exceeding the latency SLA or triggering a stack overflow.
- Testing (Consistency): Run 1,000 parallel evaluations of the same cart/rule-set and verify that the 'CalculationManifest' and final price are identical across all results with zero variance.

## Metadata
- Programming Languages: go
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
