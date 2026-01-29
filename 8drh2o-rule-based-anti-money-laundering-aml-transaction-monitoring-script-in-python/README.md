# 8DRH2O - Rule-Based Anti–Money Laundering (AML) Transaction Monitoring Script in Python

**Category:** sft

## Overview
- Task ID: 8DRH2O
- Title: Rule-Based Anti–Money Laundering (AML) Transaction Monitoring Script in Python
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 8drh2o-rule-based-anti-money-laundering-aml-transaction-monitoring-script-in-python

## Requirements
- Ingest transaction data from a CSV file with standardized fields (transaction ID, customer ID, timestamp, amount, currency, transaction type, channel, origin country, destination country, counterparty ID)
- Normalize and sort transactions chronologically
- Apply per-transaction AML rules (e.g., large cash transactions, round amounts, high-risk geographies, high-risk channels)
- Implement sliding time-window analysis for behavioral patterns such as structuring, rapid movement of funds, and frequent cash activity
- Generate AML alerts with rule identifiers, severity levels, timestamps, and explanatory details
- Deduplicate and sort alerts before output
- Export alerts to a structured CSV file
- Calculate per-customer risk scores using weighted alert severities
- Produce a customer-level risk summary CSV report
- Allow configurable thresholds and rule parameters
- Use only standard Python libraries

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
