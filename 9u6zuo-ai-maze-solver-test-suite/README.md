# 9U6ZUO - AI Maze Solver Test Suite

### Build all services:
```bash
docker-compose build
```

### Run individual services:

**Before version tests (should fail - demonstrates bugs):**
```bash
docker-compose run --rm test-before
```

**After version tests (should pass - demonstrates fixes):**
```bash
docker-compose run --rm test-after
```

**Complete evaluation:**
```bash
docker-compose run --rm evaluation
```
