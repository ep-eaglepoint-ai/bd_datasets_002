# K6JI4Z - Testing a Rule-Based AML Transaction Monitoring System

**Category:** sft

## Overview
- Task ID: K6JI4Z
- Title: Testing a Rule-Based AML Transaction Monitoring System
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: k6ji4z-testing-a-rule-based-aml-transaction-monitoring-system

## Requirements
- The test suite shall verify that the transaction monitoring engine processes transactions without runtime errors.
- The test suite shall validate that each AML rule triggers when its defined conditions are met.
- The test suite shall validate that each AML rule does not trigger when its conditions are not met.
- The test suite shall confirm that multiple AML rules can trigger from the same transaction sequence.
- The test suite shall verify that alerts contain the correct rule identifier, severity, rationale, and evidence
- The test suite shall ensure that transactions outside a rule’s time window are excluded from evaluation.
- The test suite shall validate correct pruning of historical transactions from sliding windows.
- The test suite shall ensure that repeated transactions to the same counterparty are not incorrectly counted as unique.

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
