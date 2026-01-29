## Pytest for a csv importer

## Quick start

- Test repository_before/: `docker compose run --rm -e REPO_PATH=repository_before app pytest tests/`
- Test repository_after/: `docker compose run --rm -e REPO_PATH=repository_after app pytest tests/`
- Generate evaluation report: `docker compose run --rm app python evaluation/evaluation.py`
- Add dependencies to `requirements.txt`

