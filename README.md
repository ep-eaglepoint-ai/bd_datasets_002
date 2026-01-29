docker compose run --rm -e PYTHONPATH=/app/repository_before app pytest -q
docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest -q
docker compose run --rm app python evaluation/evaluation.py
