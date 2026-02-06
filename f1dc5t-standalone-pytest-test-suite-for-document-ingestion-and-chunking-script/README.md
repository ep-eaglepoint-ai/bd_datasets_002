# F1DC5T - Standalone Pytest Test Suite for Document Ingestion and Chunking Script


## Quick start
### Docker Commands

1. **Run tests on repository_before (baseline)**
   ```bash
   docker compose run --rm -e PYTHONPATH=/app/repository_before app pytest -q
   ```

2. **Run tests on repository_after (solution)**
   ```bash
   docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest -q
   ```

3. **Run evaluation and generate report**
   ```bash
   docker compose run --rm app python evaluation/evaluation.py
   ```

### Local Testing
- Run tests locally: `python -m pytest -q tests`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
