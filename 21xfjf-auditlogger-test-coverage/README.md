# Build first
docker-compose build

# Test BEFORE version (should show failures because before is buggy):
docker-compose run --rm repository-before

# Test AFTER version (should pass all tests):
docker-compose run --rm repository-after

# Run full evaluation:
docker-compose run --rm evaluation