## Docker Commands list

### 1. AFTER TEST COMMAND
Commands to run tests on `repository_after`.
```bash
docker compose up --build
```

### 3. TEST & REPORT COMMAND
Commands to run evaluation and generate reports.
```bash
docker compose run --rm app go run evaluation/evaluation.go
```
