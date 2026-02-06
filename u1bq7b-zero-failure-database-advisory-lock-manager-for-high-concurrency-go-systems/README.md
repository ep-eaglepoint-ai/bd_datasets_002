# U1BQ7B - Zero-Failure Database Advisory Lock Manager for High-Concurrency Go Systems

- Run tests `repository_before`:
  ```bash
  docker compose run --rm -e TEST_TARGET=before app go test -v ./tests/...
  ```
- Run tests `repository_after`:

  ```bash
  docker compose run --rm app go test -v ./tests/...
  ```

- Run evaluation (Comparison):
  ```bash
  docker compose run --rm app go run evaluation/evaluation.go
  ```
