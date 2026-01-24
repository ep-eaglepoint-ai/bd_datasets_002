# Eliminate GC Thrashing and Excessive Allocations in High-Throughput Telemetry Ingestion Engine

### Run tests on repository_before:

```bash
docker compose run --rm app go test -v ./... -args -repo=../repository_before
```

### Run tests on repository_after:

```bash
docker compose run --rm app go test -v ./... -args -repo=../repository_after
```

### Run evaluation and generate report.json:

```bash
docker compose run --rm app go run ../evaluation/evaluation.go
```
