# PPRLFA - Go Concurrent Data Aggregator Goroutine Leak Fix
 
 
## Structure
- repository_before/: baseline code 
- repository_after/: optimized code 
- tests/: test suite 
- evaluation/: evaluation scripts (`evaluation.go`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick Start

### Docker Commands

Three commands using a single Docker service:

#### 1. Run tests (before – expected failures due to goroutine leaks)
```bash
docker compose run --rm app sh -c "go mod edit -replace aggregator=./repository_before && go test -v ./tests/..."
```

**Expected behavior:**
- Some tests will **FAIL** with goroutine leak errors
- Tests like `TestFetchAndAggregate_LeakOnTimeout`, `TestProcessBatch_LeakOnContextCancel`, and `TestStreamResults_LeakOnBlockedReceiver` will report: `"Potential goroutine leak: started with X, ended with Y"`
- This demonstrates the goroutine leak issues in the original implementation

#### 2. Run tests (after – expected all pass)
```bash
docker compose run --rm app sh -c "go mod edit -replace aggregator=./repository_after && go test -v ./tests/..."
```

**Expected behavior:**
- All tests should **PASS** ✅
- No goroutine leak errors
- All leak detection tests (`TestFetchAndAggregate_LeakOnTimeout`, `TestProcessBatch_LeakOnContextCancel`, `TestStreamResults_LeakOnBlockedReceiver`) pass
- Context cancellation, timer cleanup, and edge cases all handled correctly

#### 3. Run evaluation (compares both implementations)
```bash
docker compose run --rm app sh -c "cd evaluation && go mod tidy && go run evaluation.go"
```

**This will:**
- Run tests for both `repository_before` and `repository_after` implementations
- Compare results and generate metrics
- Create a detailed JSON report at `evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json`
- Display a summary showing:
  - Before tests passed: `false` (due to goroutine leaks)
  - After tests passed: `true` (leaks fixed)
  - Success: `true`

## Run Locally

### Install dependencies
```bash
go mod tidy
```

### Run tests against repository_before
```bash
# Switch to test the before implementation
go mod edit -replace aggregator=./repository_before
go test -v ./tests/...
```

### Run tests against repository_after
```bash
# Switch to test the after implementation
go mod edit -replace aggregator=./repository_after
go test -v ./tests/...
```

### Run evaluation locally
```bash
cd evaluation && go mod tidy && go run evaluation.go
```
## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
