# Trajectory: Rule-Based AML Transaction Monitoring

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: "What exactly needs to be built, and what are the constraints?"

**Reasoning**:
The primary goal is to build a robust, rule-based Anti-Money Laundering (AML) transaction monitoring system. This system must ingest transaction data, apply both stateless (per-transaction) and behavioral (window-based) rules to detect suspicious activity, and generate actionable alerts and risk summaries. The system should be modular, extensible, and capable of being run in a containerized environment for evaluation.

**Key Requirements**:
- **Data Ingestion**: Robust reading of transaction data from CSV format with validation.
- **Stateless Monitoring**: Implementation of rules that can be evaluated on a single transaction (e.g., large cash transactions, round amounts, high-risk geographies/channels).
- **Behavioral Monitoring**: Implementation of rules that require looking at a window of transactions (e.g., rapid movement of funds, rapid succession of transactions).
- **Alert Management**: Deduplication and sorting of generated alerts to ensure clarity and avoid noise.
- **Risk Scoring**: Generation of a customer-level risk summary based on the detected suspicious activities.
- **Execution & Evaluation**: A unified entry point (`main.py`) for the pipeline and a dockerized evaluation environment to verify correctness.

### 2. Phase 2: ARCHITECTURE / DESIGN
**Guiding Question**: "How should the system be structured to be both efficient and maintainable?"

**Reasoning**:
A modular architecture is essential to separate concerns between data I/O, rule logic, behavioral analysis, and post-processing. This allows for independent testing and easier addition of new rules in the future.

**Core Components**:
- **IO Layer**: Handles CSV parsing and data model instantiation.
- **Rule Engine**: A collection of stateless functions for immediate transaction checking.
- **Behavioral Engine**: A sliding-window processor for cross-transaction patterns.
- **Post-processing**: Logic for alert deduplication and exporting results to standard formats.
- **Evaluation Layer**: A standalone script and Docker configuration to automate testing and reporting.
