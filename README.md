# Production Grade Validation Test Suite for Validate Function

This repository contains a test suite for validating Go functions with a focus on production-grade standards.

## 🐳 Docker Commands

Use the following commands to build and run the validation suite using Docker:

### 1. Build the Docker Image
Build the environment with all necessary dependencies (Go 1.22 and Python 3.11).
```bash
docker build -t jr2pzv-validation-app .
```

### 2. Run Repository Tests
Run the Go tests for the validation logic.
```bash
docker run --rm jr2pzv-validation-app bash -c "cd repository_after && go test -v ./..."
```

### 3. Run Full Evaluation
Execute the Python evaluation script to generate the final validation report.
```bash
docker run --rm jr2pzv-validation-app python3 -m evaluation.evaluation
```

## 📂 Project Structure
- `repository_before/`: Baseline state of the repository.
- `repository_after/`: Repository state after validation logic implementation.
- `evaluation/`: Python-based evaluation and reporting suite.
- `tests/`: Additional test cases and validation infrastructure.
