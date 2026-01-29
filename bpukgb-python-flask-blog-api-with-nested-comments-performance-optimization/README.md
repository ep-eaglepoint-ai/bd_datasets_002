# BPUKGB - Python Flask Blog API with Nested Comments - Performance Optimization

**Category:** sft

## Overview
- Task ID: BPUKGB
- Title: Python Flask Blog API with Nested Comments - Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: bpukgb-python-flask-blog-api-with-nested-comments-performance-optimization

## Requirements
- Comment loading must retrieve all comments for a post in one database query using a recursive CTE or by loading all post comments and building the tree in memory. The buggy code calls get_children() recursively which executes a new SELECT for each comment. To verify: enable SQLAlchemy query logging and load a post with 100 comments - the log should show 1-3 queries total, not 100+ separate SELECT statements.
- Comment serialization must enforce a configurable maximum depth and return a flag indicating when children were truncated. The buggy code recurses indefinitely until hitting Python's stack limit. To verify: create a comment thread 25 levels deep and request with max_depth=10 - response should show exactly 10 levels with a has_more_replies or similar field set to true on truncated nodes, and the server must not crash.
- The parent_id column must have a database index to enable efficient child lookups. The buggy code has no index causing full table scans. To verify: run EXPLAIN ANALYZE on a query filtering by parent_id - the output should show Index Scan or Index Only Scan, not Seq Scan.
- Comment filtering must happen in SQL using WHERE clauses, not by loading all rows then filtering in Python. The buggy code executes Comment.query.all() then uses list comprehensions to filter. To verify: inspect the generated SQL - it must include WHERE post_id = :id, and memory profiling should show loading only the relevant comments.
- Pagination must use keyset/cursor approach with a composite key of (created_at, id) instead of OFFSET. The buggy code uses .offset().limit() which returns inconsistent results when new comments are inserted between page requests. To verify: insert a new root comment between fetching page 1 and page 2 - page 2 should not skip or duplicate any comments that existed before the insert.
- Serialized comment trees must be cached with appropriate TTL and invalidated when comments are created, updated, or deleted. The buggy code rebuilds the entire tree on every request. To verify: make two identical requests for the same post's comments - the second request should return significantly faster and query logs should show no database queries on cache hit.
- All relationship loading must use explicit strategies like joinedload() or selectinload() rather than relying on lazy loading defaults. The buggy code uses lazy='select' which causes unpredictable query counts depending on attribute access patterns. To verify: query logging should show identical query counts regardless of which comment attributes are accessed in the response.
- Comment counts must use SQL COUNT aggregate function via session.query(func.count()) or a column_property subquery. The buggy code uses len(post.comments) which loads the entire relationship into memory. To verify: getting the count for a post with 5000 comments should execute a single COUNT query and complete in under 50ms without loading comment objects.
- Deleting a comment must remove all descendants in a single bulk DELETE operation using either a recursive CTE or by collecting all descendant IDs first then executing one DELETE WHERE id IN (...). The buggy code traverses the tree and calls session.delete() on each comment individually. To verify: delete a comment with 500 replies - query logs should show one or two DELETE statements, not 500.
- The Post model's comments relationship must use lazy='select' or lazy='noload' so that querying posts does not automatically load comments. The buggy code has lazy='joined' causing every Post query to JOIN the comments table. To verify: fetching a list of 50 posts should not execute any queries against the comments table.
- Building the comment tree from a flat list must use O(n) algorithm with dictionary-based parent lookup, not O(n²) nested loops. The buggy code scans the entire comment list for each comment to find its children. To verify: building a tree from 5000 comments should complete in under 100ms - measure with time.perf_counter() before and after the tree building function.
- Database sessions must be scoped to requests and properly closed using context managers or Flask teardown handlers to prevent connection pool exhaustion. The buggy code creates sessions with get_session() but never closes them consistently. To verify: run a load test with 100 concurrent requests - the connection pool should not exhaust and all requests should complete without "too many connections" errors.

## Metadata
- Programming Languages: Python
- Frameworks: Flask
- Libraries: (none)
- Databases: PostgressSQL
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
