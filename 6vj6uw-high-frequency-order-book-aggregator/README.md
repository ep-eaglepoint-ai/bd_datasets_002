
### Docker Setup
```bash 
# Build Docker image
docker-compose build

```
#### Quick Start with Docker
```bash
# Run tests before
docker-compose run --rm repository-before

# Run tests after 
docker-compose run --rm repository-after

# Generate evaluation report
docker-compose run --rm evaluate
```
