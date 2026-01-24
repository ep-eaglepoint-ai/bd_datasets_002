# I5FJUO - hamiltonian-path-problem

## Folder Layout
- `repository_before/` — baseline (empty) 
- `repository_after/` — refactored (graph, solver, delivery, demo) implementation
- `tests/` — test suite (test.py)
- `evaluation/` — evaluation.py and reports (`reports/yy-mm-dd/time-sec/report.json`)
- `instances/` — sample instances (JSON)
- `patches/` — diff between before/after
- `trajectory/` — notes (Markdown)

## Run with Docker

### Build image
```bash
docker compose build
```
## no test for before_repository since the task is new

### Run tests (after – expected all pass)
```bash
docker compose --profile test-after run --rm test-after
```

### Run evaluation
```bash
docker compose --profile evaluation run --rm evaluation
```
 

## Regenerate Patch
```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
