# J1P4VF - ecommerce-order-processing -refactor

**Category:** sft

## Overview
- Task ID: J1P4VF
- Title: ecommerce-order-processing -refactor
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: j1p4vf-ecommerce-order-processing-refactor

## Requirements
- Service Decoupling: Extract the logic for 'Tax Calculation', 'Inventory Management', and 'Payment Processing' into separate, stateless service classes or modules. The main orchestrator should only coordinate these services.
- Pipeline Orchestration: Implement a structured pipeline or chain where each step (Validate -> Calculate -> Pay -> Reserve) is executed in order. The system must support the future injection of a 'FraudCheck' step without modifying the core services.
- Standardized Error Handling: Replace the boolean 'success' returns with a robust error-handling strategy (e.g., custom Error classes or a Result monad). Every step must report a specific failure reason (e.g., INSUFFICIENT_FUNDS vs STOCK_UNAVAILABLE).
- Transactional Parity: Ensure the refactored code maintains the business logic where inventory is only reserved after a successful payment authorization, as seen in the legacy code.
- Tax Rule Externalization: Move the hardcoded 8.25% and 9.25% tax rates into a configuration object or a dedicated TaxService to allow for regional scaling.
- Data Shape Preservation: The input orderData and the final return { success: boolean, orderId?: string, error?: string } must remain compatible with existing callers to prevent breaking the web frontend.
- Testing Requirement (Isolation): Provide unit tests that use mock versions of the new services to prove that the 'OrderOrchestrator' can handle a Payment failure without ever calling the Inventory reservation logic.
- Testing Requirement (State): Verify that if an order for California is processed, the total calculation correctly uses the 9.25% rate derived from the legacy logic.

## Metadata
- Programming Languages: JavaScript
- Frameworks: Node.js
- Libraries: (none)
- Databases: (none)
- Tools: Jest, Mocha
- Best Practices: (none)
- Performance Metrics: Non-blocking Event Loop, Memory Footprint Optimization
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
