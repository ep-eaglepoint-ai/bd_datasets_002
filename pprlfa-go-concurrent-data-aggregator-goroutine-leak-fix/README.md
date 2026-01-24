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

Three Docker services for different test scenarios:

#### 1. Run tests (before – expected failures due to goroutine leaks)
```bash
docker compose run --rm test_before
```
 

#### 2. Run tests (after – expected all pass)
```bash
docker compose run --rm test_after
```
 

#### 3. Run evaluation (compares both implementations)
```bash
docker compose run --rm evaluation
```

```
## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
