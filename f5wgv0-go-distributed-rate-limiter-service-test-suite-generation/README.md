```bash
# Build Docker images
docker-compose run --rm test-after
docker-compose run --rm evaluation
# PRIMARY: Run fast mock tests (validates all requirements, no Redis)

```