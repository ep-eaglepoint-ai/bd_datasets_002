# Z8OPST - Python Rate Limiter with Sliding Window 

## Commands

### Test repository_before/

docker compose run --rm app sh -c 'PYTHONPATH=/app/repository_before python3 -m pytest tests/test_limiter.py || true'

### Test repository_after

docker compose run --rm app sh -c 'PYTHONPATH=/app/repository_after python3 -m pytest -v tests/test_limiter.py'


### Generate evaluation report

docker compose run --rm app python3 evaluation/evaluation.py