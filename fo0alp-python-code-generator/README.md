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
 
### Run tests (after – expected all pass)

```bash
docker compose run --rm test-after
```
 
```bash
docker compose run --rm evaluation
```
 

## Regenerate patch

```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
 

 
