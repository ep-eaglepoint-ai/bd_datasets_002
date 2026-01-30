# jkp2sp-robotic-armactuator-logic-refactor

## Docker Commands

Test repository_before (legacy code):
```bash
docker compose run test-before
```

Test repository_after (refactored code):
```bash
docker compose run test-after
```

Run evaluation (compares before and after):
```bash
docker compose run evaluate
```

## Evaluation Report

The evaluation script generates a report at `evaluation/reports/latest.json` with the following structure:

```json
{
  "run_id": "uuid",
  "started_at": "ISO-8601",
  "finished_at": "ISO-8601",
  "duration_seconds": 0.0,
  "environment": {
    "python_version": "1.21",
    "platform": "os-arch"
  },
  "before": {
    "tests": {
      "passed": false,
      "return_code": 1,
      "output": "go test output (truncated)"
    },
    "metrics": {}
  },
  "after": {
    "tests": {
      "passed": true,
      "return_code": 0,
      "output": "go test output (truncated)"
    },
    "metrics": {}
  },
  "comparison": {
    "passed_gate": true,
    "improvement_summary": "After implementation passed correctness tests"
  },
  "success": true,
  "error": null
}
```
