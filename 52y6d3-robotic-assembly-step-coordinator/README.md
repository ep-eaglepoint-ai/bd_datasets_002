## Docker Commands list

### 1. BEFORE TEST COMMAND
Commands to spin up the app and run tests on `repository_before`. Since it's empty, this will fail.
```bash
docker compose run --rm app sh -c "echo 'Running tests on repository_before...' && exit 1"
```

### 2. AFTER TEST COMMAND
Commands to run tests on `repository_after`.
```bash
docker compose up --build
```

### 3. TEST & REPORT COMMAND
Commands to run evaluation and generate reports.
```bash
docker compose run --rm app go run evaluation/evaluation.go
```
