```bash
docker compose run --rm tests python -m pytest tests/test_before.py 
```
```bash
docker compose run --rm tests python -m pytest tests/test_after.py -v 
```

```bash
docker compose run --rm evaluation python evaluation/evaluation.py
```
