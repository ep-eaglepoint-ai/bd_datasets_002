Deterministic Financial Calculator Refactor

Run application before refactor. Expected non deterministic behavior.

Before Command
docker run --rm -e APP_VERSION=before hailu3548/jr2pzv-app

Expected behavior

Calculator runs using the original implementation

Results may vary due to non deterministic logic

Run application after refactor. Expected deterministic behavior.

After Command
docker run --rm -e APP_VERSION=after hailu3548/jr2pzv-app

Expected behavior

Calculator runs using the refactored implementation

Results are consistent and deterministic

Run evaluation. Compares before and after results and generates a report.

Evaluation Command
docker run --name eval-temp hailu3548/jr2pzv-app:latest && docker cp eval-temp:/app/evaluation/report.json ./evaluation/report.json && docker rm eval-temp

This will

Execute both before and after calculator versions

Compare outputs for determinism and correctness

Save the evaluation report to ./evaluation/report.json