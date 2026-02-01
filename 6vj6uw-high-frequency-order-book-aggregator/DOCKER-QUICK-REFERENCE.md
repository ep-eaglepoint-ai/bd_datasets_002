# Docker Quick Reference - OrderBook Aggregator

## Container Name Mapping

| Service | Container Name | Purpose |
|---------|----------------|---------|
| `test-before` | `repository-before` | Test original array-based implementation |
| `test-after` | `repository-after` | Test optimized Red-Black Tree implementation |
| `test-comparison` | `repository-comparison` | Compare both implementations |
| `evaluate` | `evaluate` | Generate comprehensive evaluation report |
| `test-memory` | `repository-memory` | Run memory leak tests |
| `build` | `repository-build` | Build and validate TypeScript |
| `dev` | `orderbook-dev` | Interactive development environment |
| `test-all` | `test-all` | Run all tests in sequence |

## Quick Commands

### Setup
```bash
# Build Docker image
docker-compose build

# Verify setup
./scripts/docker-test.sh verify          # Linux/macOS
scripts\docker-test.bat verify           # Windows
```

### Individual Tests
```bash
# Test original implementation (will fail performance requirements)
docker-compose run --rm test-before

# Test optimized implementation (should pass all requirements)
docker-compose run --rm test-after

# Compare both implementations
docker-compose run --rm test-comparison
```

### Comprehensive Testing
```bash
# Run all tests in sequence
docker-compose run --rm test-all

# Generate evaluation report
docker-compose run --rm evaluate

# Run memory leak tests
docker-compose run --rm test-memory
```

### Development
```bash
# Interactive development environment
docker-compose run --rm dev

# Build TypeScript
docker-compose run --rm build
```

### Container Management
```bash
# List project containers
docker ps -a --filter "name=repository"

# View container logs
docker logs repository-before
docker logs repository-after
docker logs evaluate

# Stop and remove all containers
docker-compose down
```

### Helper Scripts
```bash
# Linux/macOS
./scripts/docker-test.sh test-all
./scripts/docker-test.sh evaluate
./scripts/docker-test.sh help

# Windows
scripts\docker-test.bat test-all
scripts\docker-test.bat evaluate
scripts\docker-test.bat help
```

## Expected Results

### repository-before Container
```
❌ Overall: FAILED
📈 Performance: ~10,150 ops/sec
⚡ P99 Latency: ~550μs (FAILS < 500μs requirement)
🎯 Throughput: ~6,258 ops/sec (FAILS ≥ 100k requirement)
```

### repository-after Container
```
✅ Overall: PASSED
📈 Performance: ~841,520 ops/sec
⚡ P99 Latency: ~6.20μs (EXCEEDS < 500μs requirement)
🎯 Throughput: ~436,050 ops/sec (EXCEEDS ≥ 100k requirement)
```

## Troubleshooting

### Container Not Found
```bash
# If you see "container not found" errors:
docker-compose down
docker-compose build
```

### Permission Issues
```bash
# Linux/macOS - Fix script permissions
chmod +x scripts/*.sh

# Fix report directory permissions
sudo chown -R $USER:$USER evaluation/reports/
```

### Docker Issues
```bash
# Check Docker status
docker info

# Clean up Docker system
docker system prune -f
docker-compose down -v --remove-orphans
```

## File Locations

- **Docker Compose**: `docker-compose.yml`
- **Dockerfile**: `Dockerfile`
- **Helper Scripts**: `scripts/docker-test.sh`, `scripts/docker-test.bat`
- **Test Reports**: `evaluation/reports/`
- **Documentation**: `DOCKER.md`, `TESTING.md`