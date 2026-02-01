# Docker Setup for OrderBook Aggregator

This document explains how to run the OrderBook Aggregator tests using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [Docker Compose](https://docs.docker.com/compose/install/) installed

## Quick Start

### 1. Build the Docker Image
```bash
docker-compose build
```

### 2. Run All Tests
```bash
docker-compose run --rm test-all
```

### 3. View Results
```bash
# Check the latest evaluation report
cat evaluation/reports/latest-report.json
```

## Available Services

### Individual Test Services

#### Test Original Implementation
```bash
docker-compose run --rm test-before
```
Tests `repository_before/OrderBookAggregator.ts` (original array-based implementation)

#### Test Optimized Implementation
```bash
docker-compose run --rm test-after
```
Tests `repository_after/OrderBookAggregator.ts` (optimized Red-Black Tree implementation)

#### Comparison Tests
```bash
docker-compose run --rm test-comparison
```
Runs both implementations with identical test cases and compares results

#### Evaluation Report
```bash
docker-compose run --rm evaluate
```
Generates comprehensive JSON report comparing both implementations

#### Memory Leak Tests
```bash
docker-compose run --rm test-memory
```
Runs memory leak tests with garbage collection exposure

### Utility Services

#### Build TypeScript
```bash
docker-compose run --rm build
```
Compiles TypeScript and validates the build

#### Development Environment
```bash
docker-compose run --rm dev
```
Starts an interactive bash shell inside the container for development

#### Run All Tests in Sequence
```bash
docker-compose run --rm test-all
```
Runs all test suites in sequence with comprehensive reporting

## Helper Scripts

### Linux/macOS
```bash
# Make script executable (Linux/macOS only)
chmod +x scripts/docker-test.sh

# Use the helper script
./scripts/docker-test.sh test-all
./scripts/docker-test.sh evaluate
./scripts/docker-test.sh help
```

### Windows
```cmd
# Use the Windows batch script
scripts\docker-test.bat test-all
scripts\docker-test.bat evaluate
scripts\docker-test.bat help
```

## Docker Compose Services Overview

| Service | Container Name | Purpose | Command |
|---------|----------------|---------|---------|
| `test-before` | `repository-before` | Test original implementation | `npm run test:before` |
| `test-after` | `repository-after` | Test optimized implementation | `npm run test:after` |
| `test-comparison` | `repository-comparison` | Compare both implementations | `npm run test:comparison` |
| `evaluate` | `evaluate` | Generate evaluation report | `npm run evaluate` |
| `test-memory` | `repository-memory` | Memory leak testing | `npm run test:memory` |
| `build` | `repository-build` | Build TypeScript | `npm run build` |
| `dev` | `orderbook-dev` | Interactive development | `/bin/bash` |
| `test-all` | `test-all` | Run all tests sequentially | Multiple commands |

## Expected Results

### repository_before (Original Implementation)
```
❌ Overall: FAILED
📈 Performance: ~10,150 ops/sec average
⚡ P99 Latency: ~550μs (FAILS requirement)
🎯 Throughput: ~6,258 ops/sec (FAILS requirement)
```

### repository_after (Optimized Implementation)
```
✅ Overall: PASSED
📈 Performance: ~841,520 ops/sec average
⚡ P99 Latency: ~6.20μs (EXCEEDS requirement)
🎯 Throughput: ~436,050 ops/sec (EXCEEDS requirement)
```

## Volume Mounts

The Docker setup includes several volume mounts:

- **Source Code**: `.:/app` - Live code updates during development
- **Node Modules**: `/app/node_modules` - Cached dependencies
- **Reports**: `./evaluation/reports:/app/evaluation/reports` - Persistent test reports

## Environment Variables

- `NODE_ENV=test` - Set for test services
- `NODE_ENV=development` - Set for development services
- `NODE_OPTIONS=--expose-gc` - Enables garbage collection for memory tests

## Troubleshooting

### Docker Not Running
```bash
# Check Docker status
docker info

# Start Docker (varies by OS)
# Linux: sudo systemctl start docker
# macOS/Windows: Start Docker Desktop
```

### Build Issues
```bash
# Clean build
docker-compose build --no-cache

# Remove old containers
docker-compose down -v --remove-orphans
```

### Permission Issues (Linux/macOS)
```bash
# Fix script permissions
chmod +x scripts/docker-test.sh

# Fix file ownership
sudo chown -R $USER:$USER evaluation/reports/
```

### Memory Issues
```bash
# Clean up Docker system
docker system prune -f

# Remove unused volumes
docker volume prune -f
```

## Development Workflow

### 1. Initial Setup
```bash
# Build the image
docker-compose build

# Run all tests to verify setup
docker-compose run --rm test-all
```

### 2. Development Cycle
```bash
# Start development environment
docker-compose run --rm dev

# Inside container:
npm run test:after
npm run evaluate
exit
```

### 3. Continuous Testing
```bash
# Test specific implementation
docker-compose run --rm test-after

# Generate reports
docker-compose run --rm evaluate

# View results
cat evaluation/reports/latest-report.json
```

## Performance Optimization

### Docker Build Optimization
- Uses `.dockerignore` to exclude unnecessary files
- Multi-stage build process
- Cached dependency installation
- Pre-built TypeScript compilation

### Runtime Optimization
- Volume mounts for fast code updates
- Shared node_modules volume
- Minimal container overhead
- Efficient resource allocation

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: OrderBook Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Docker Tests
        run: |
          docker-compose build
          docker-compose run --rm test-all
      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: evaluation-reports
          path: evaluation/reports/
```

### Jenkins Pipeline Example
```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'docker-compose build'
            }
        }
        stage('Test') {
            steps {
                sh 'docker-compose run --rm test-all'
            }
        }
        stage('Archive') {
            steps {
                archiveArtifacts 'evaluation/reports/**/*'
            }
        }
    }
}
```

## Container Management

### View Running Containers
```bash
# List all containers (running and stopped)
docker ps -a

# Filter by project containers
docker ps -a --filter "name=repository"
docker ps -a --filter "name=evaluate"
docker ps -a --filter "name=test-all"
```

### Stop and Remove Containers
```bash
# Stop specific container
docker stop repository-before
docker stop repository-after

# Remove specific container
docker rm repository-before
docker rm repository-after

# Stop and remove all project containers
docker-compose down
```

### View Container Logs
```bash
# View logs from specific container
docker logs repository-before
docker logs repository-after
docker logs evaluate

# Follow logs in real-time
docker logs -f test-all
```

## Cleanup

### Remove Containers and Volumes
```bash
docker-compose down -v --remove-orphans
```

### Full System Cleanup
```bash
# Remove all unused Docker resources
docker system prune -a -f

# Remove all volumes
docker volume prune -f
```

## Security Considerations

- Containers run as non-root user where possible
- No sensitive data in environment variables
- Minimal attack surface with slim base image
- Regular security updates for base images

The Docker setup provides a consistent, reproducible environment for running OrderBook Aggregator tests across different platforms and CI/CD systems.