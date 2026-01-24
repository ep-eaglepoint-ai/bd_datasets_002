# Test Suite for Kanban Board

This repository contains a comprehensive test suite for a draggable Kanban board application. Tests use static code validation without browser automation.

## Running Tests

The entire test suite can be run using Docker Compose:

```bash
# Test repository_before (should fail - no tests exist)
docker-compose run --rm test-before

# Test repository_after (should pass - tests implemented)
docker-compose run --rm test-after

# Run full evaluation (solution tests + meta-tests)
docker-compose run --rm evaluation
```

## Structure

- `repository_before/` - Original Kanban app (problem state)
- `repository_after/` - Solution with test suite
- `tests/` - Meta-tests that validate test quality (static validation)
- `evaluation/` - Test runners and reporting logic
- `instances/instances.json` - Problem statement and metadata
- `patches/solution.patch` - Git diff showing changes
- `trajectory/trajectory.md` - Engineering documentation
