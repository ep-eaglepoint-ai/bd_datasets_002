# FO0ALP - python-code-generator
 

## Folder layout

- `repository_before/` — baseline (buggy) implementation
- `repository_after/` — refactored implementation
- `tests/` — test suite (parametrized: `before` / `after`)
- `evaluation/` — `evaluation.py` and `reports/`
- `instances/` — sample instances (JSON)
- `patches/` — diff between before/after
- `trajectory/` — notes (Markdown)

## Run with Docker

### Build image

```bash
docker compose build
```

### Run tests (before – expected to fail)

```bash
docker compose run --rm test-before
```

**Expected behavior:** Tests run with `-k before` (uses `repository_before`). The generator fails to import or run, so the test fails (1 failed). The `|| exit 0` keeps the container exit code 0.

### Run tests (after – expected all pass)

```bash
docker compose run --rm test-after
```

**Expected behavior:** Tests run with `-k after` (uses `repository_after`). All requirement checks pass (custom classes, validation, serialization, type-safe accessors).

### Run evaluation (compares both implementations)

```bash
docker compose run --rm evaluation
```

This will:

- Run pytest for both before and after (`-k before`, `-k after`)
- Produce a report at `evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json`

## Run locally

### Install dependencies

```bash
pip install -r requirements.txt
```

### Run tests

```bash
# Before (expected 1 failed — generator is buggy)
python -m pytest tests/ -v --tb=short -k before

# After (expected all pass)
python -m pytest tests/ -v --tb=short -k after

# All (both parametrized cases)
python -m pytest tests/ -v --tb=short
```

### Run evaluation

```bash
python evaluation/evaluation.py
```

## Regenerate patch

From repo root:

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
 

 
