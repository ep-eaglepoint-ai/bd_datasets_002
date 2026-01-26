### Build all services
docker-compose build

### Run tests for BEFORE version (expected to fail logically)
docker-compose run --rm repository-before

### Run tests for AFTER version (expected to pass)
docker-compose run --rm repository-after

### Run evaluation (which should internally run Jest and generate a report)
docker-compose run --rm evaluation