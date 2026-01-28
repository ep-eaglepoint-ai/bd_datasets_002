# BVUSV0 - Watermarked Tumbling Window Aggregator for Infinite Streams

## Quick start

### Run tests (after - expected all pass)
```bash
docker compose run --rm -e PYTHONPATH=/app/repository_after app python -m pytest -q tests/
```

**Expected behavior:**
- Functional tests: ✅ PASS
- Structural tests: ✅ PASS
- Score tests: ✅ PASS

### Run evaluation
```bash
docker compose run --rm -e PYTHONPATH=/app app python evaluation/evaluation.py
```

This will:
- Run all tests for the implementation
- Generate a report at `evaluation/YYYY-MM-DD/HH-MM-SS/report.json`

### Run evaluation with custom output file
```bash
docker compose run --rm -e PYTHONPATH=/app app python evaluation/evaluation.py --output /path/to/custom/report.json
```

### Generate patch file
```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```