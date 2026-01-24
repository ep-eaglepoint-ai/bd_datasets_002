# C37VUU - slidingWindowRateLimiterResilienceSuite

## Commands

Run test
```bash
docker-compose run app sh -c "PYTHONPATH=repository_before pytest repository_after -q"
```

Run meta test
```bash
docker-compose run app pytest tests -q
```

Run evaluation:
```bash
docker-compose run app python evaluation/evaluation.py
```