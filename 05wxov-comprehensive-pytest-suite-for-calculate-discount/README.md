# 05WXOV - Comprehensive Pytest Suite for calculate_discount

**Category:** sft

## Overview
- Task ID: 05WXOV
- Title: Comprehensive Pytest Suite for calculate_discount
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 05wxov-comprehensive-pytest-suite-for-calculate-discount
# Discount Engine Verification & Evaluation

This repository contains a high-fidelity verification suite for the Discount Engine implementation. All commands are designed to run within a  Docker environment to ensure bit-level reproducibility.

## 🚀 Evaluation Commands

### 1. Ground Truth Verification
Runs the comprehensive test suite against the implementation to verify all business rules, rounding precision, and boundary conditions.
```bash
docker compose run --rm app python3 -m pytest repository_after/src/test_discount_engine.py
```

### 2. Requirement Meta-Audit

Executes adversarial meta-tests to ensure the test suite correctly audits strict requirements like non-stacking rules and temporal logic.
```bash
docker compose run --rm app python3 -m pytest tests/discount_engine_meta_test.py
```
### 3. Canonical Evaluation Report

Executes the master evaluation script to generate a timestamped, machine-readable report.json summarizing the task's success.
```bash
docker compose run --rm app python3 evaluation/evaluation.py
```