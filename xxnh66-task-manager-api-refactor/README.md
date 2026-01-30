# XXNH66 - Task Manager API Refactor

### Run tests (before – expected some failures)
```bash
# Run Go tests for the baseline implementation
docker run --rm -w /app/repository_before hailu3548/jr2pzv-app:latest go test -v ./...
```

**Expected behavior:**
- Functional tests: ❌ FAIL (expected - concurrency and data integrity issues)
- Race detector: ❌ FAIL (expected - data races detected)

### Run tests (after – expected all pass)
```bash
# Run Go tests for the refactored implementation
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:latest go test -v ./...
```

**Expected behavior:**
- Functional tests: ✅ PASS (All 16 requirements met)
- Race detector: ✅ PASS (Zero race warnings)

#### Run evaluation (compares both implementations)
```bash
# Runs the evaluation suite and outputs results to stdout for CI capture
docker run --rm hailu3548/jr2pzv-app:latest python evaluation/evaluation.py
```

This will:
- Run tests for both before and after implementations
- Run structure and equivalence tests
- Output a full JSON report to the console logs for automated capture
