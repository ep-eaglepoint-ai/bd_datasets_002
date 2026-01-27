# EFGC48 - idempotent-financial-transaction-ledger

## Running Tests

To run tests for the repository_before (buggy implementation):
```
docker compose run app pytest tests --repo before
```

To run tests for the repository_after (refactored implementation):
```
docker compose run app pytest tests --repo after
```
