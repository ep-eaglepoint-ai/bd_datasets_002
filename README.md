# bd_datasets_002

# Docker Setup

Simple Docker configuration for the CSV Dataset Explorer.

## Quick Start

### Development
```bash
docker-compose up app
```
App runs at http://localhost:3000

### Run Tests
```bash
docker-compose up test
```

### Run Evaluation
```bash
docker-compose up evaluate
```
Generates detailed test reports in `evaluation/reports/`

### Production
```bash
docker-compose up prod
```

## Commands

- `docker-compose up app` - Start development server
- `docker-compose up test` - Run tests once
- `docker-compose up evaluate` - Run evaluation and generate reports
- `docker-compose up prod` - Build and run production server
- `docker-compose build` - Build the Docker image
- `docker-compose down` - Stop and remove containers

That's it!