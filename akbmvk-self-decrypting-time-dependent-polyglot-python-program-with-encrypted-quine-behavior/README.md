# AKBMVK - Self‑Decrypting Time‑Dependent Polyglot Python Program with Encrypted Quine Behavior



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


