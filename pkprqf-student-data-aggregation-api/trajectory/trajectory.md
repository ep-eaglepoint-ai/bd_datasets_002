# Trajectory: Student Data Aggregation API Refactoring

## Initial Assessment

Looked at the repository_before code (dataAggregation.java) and immediately spotted several issues:

1. Integer division bug on line 51 - `totalScore / students.size()` loses decimal precision
2. No input validation - empty names and negative scores are silently accepted
3. O(n²) nested loop for finding top student - inefficient but not critical
4. Everything crammed into one monolithic controller class with nested Student class

The goal was clear: write tests that catch these bugs, then verify the refactored repository_after fixes them.

## Key Decision

I decided NOT to touch repository_before at all. The constraint was that only dataAggregation.java should exist there. Instead, I focused entirely on writing tests that would:
- FAIL when run against the buggy repository_before
- PASS when run against the fixed repository_after

## Test Strategy

Chose specific test values to expose the integer division bug:
- Scores: 85, 92, 79 (total = 256)
- 256 / 3 = 85 with integer division
- 256.0 / 3 = 85.333... with proper double division

This makes the test fail with a clear difference (85.0 vs 85.33...) when the bug exists.

For validation, tested that empty names and negative scores should return 400 Bad Request. The buggy code returns 200 OK.

## Docker Setup

The docker-compose handles copying code:
- test-before: Uses sed to transform dataAggregation.java into the expected package structure, then runs tests
- test-after: Copies the properly structured repository_after code and runs tests

## Results

test-before: 5 failures, 3 errors (as expected - bugs detected)
test-after: 26/26 tests passed

Evaluation also passed with all structural checks and tests green.

## What I Learned

The tricky part was making tests work with both code structures. The repository_before has a monolithic design while repository_after has proper separation (controller, service, DTOs). The docker-compose sed commands bridge this gap by transforming the before code at runtime.

Also had to adjust one test - originally tested for "filtering" empty names, but repository_after validates and rejects them entirely (400 error). Changed the test to expect 400 instead of 200 with filtered results.
