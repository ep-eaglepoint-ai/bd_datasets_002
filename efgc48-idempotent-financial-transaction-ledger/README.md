# EFGC48 - idempotent-financial-transaction-ledger

## Running Tests

To run tests for the repository_before 
```bash
docker compose run --rm app pytest tests --repo before; exit 0
```

To run tests for the repository_after 
```bash
docker compose run --rm app pytest tests --repo after; exit 0
```

## Running Evaluation

To run the evaluation comparing before and after:
```bash
docker compose run app python evaluation/evaluation.py
```
