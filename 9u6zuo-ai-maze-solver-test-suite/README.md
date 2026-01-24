# 9U6ZUO - AI Maze Solver Test Suite

## Docker Commands

### Build the test environment:
```bash
docker build -t maze-solver-tests .
```

### Run individual test suites:

**Before version (should fail - demonstrates bugs):**
```bash
docker run --rm maze-solver-tests sh -c "cd tests && npx jest before-version.test.js --verbose"
```

**After version (should pass - demonstrates fixes):**
```bash
docker run --rm maze-solver-tests sh -c "cd tests && npx jest after-version.test.js --verbose"
```

### Run complete evaluation:
```bash
docker run --rm -v $(pwd)/evaluation/reports:/app/evaluation/reports maze-solver-tests node evaluation/evaluation.js
```
