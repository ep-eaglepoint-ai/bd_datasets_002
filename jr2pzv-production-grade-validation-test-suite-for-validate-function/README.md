# Production Grade Validation Test Suite for Validate Function

This repository contains a test suite for validating Go functions with a focus on production-grade standards.

## 🐳 Docker Commands

The Docker setup is **multi-platform compatible** and works on Linux, macOS, and Windows.

### 🚀 Using Docker Compose (Recommended)
This is the easiest way to build and run everything in one go:
```bash
# Build and run evaluation
docker-compose up --build
```

### 🛠️ Manual Docker Commands
If you prefer to run Docker commands manually:

```bash
# Build image
docker build -t jr2pzv-validation-app .

# Run evaluation (creates report.json)
docker run --rm -v "$(pwd):/app" jr2pzv-validation-app

# Run tests directly
docker run --rm jr2pzv-validation-app go test -v ./repository_after/...
```

## 📂 Project Structure
- `repository_before/`: Baseline state of the repository.
- `repository_after/`: Repository state after validation logic implementation.
- `evaluation/`: Python-based evaluation and reporting suite.
- `tests/`: Additional test cases and validation infrastructure.
