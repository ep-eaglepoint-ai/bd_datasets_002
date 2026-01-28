# HOFAZ9 - Python FastAPI Product Catalog API Performance Optimization

**Category:** sft

## Overview
- Task ID: HOFAZ9
- Title: Python FastAPI Product Catalog API Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: hofaz9-python-fastapi-product-catalog-api-performance-optimization

## Requirements
- Response time for GET /products must stay under 200ms at P95 when handling 500 concurrent requests. The current implementation takes 4.2 seconds because it executes 847 separate database queries for a single page of 20 products - one query for products, then loops to fetch category, reviews, and inventory individually for each product (classic N+1 problem).
- Database query count per request must be under 5 queries total. Currently the get_products function fetches products first, then inside a for-loop executes db.query(Category).filter(Category.id == product.category_id) for each of the 20 products, resulting in 20+ additional queries just for categories.
- Review data must be fetched in bulk using SQLAlchemy selectinload() instead of per-product queries. The current implementation runs db.query(Review).filter(Review.product_id == product.id) inside a loop, adding another 20 queries per page. selectinload is optimal for one-to-many relationships as it uses a single IN query.
- Inventory data must be eagerly loaded with the product query using joinedload() since it's a one-to-one relationship. Currently db.query(Inventory).filter(Inventory.product_id == product.id) is called per product, adding 20 more queries. joinedload performs a single JOIN which is efficient for one-to-one.
- Database connection pool must support 500 concurrent users without exhaustion. The current create_engine() uses default pool settings (pool_size=5, max_overflow=10) which causes "QueuePool limit of size 5 overflow 10 reached" errors under load. Configure pool_size=20, max_overflow=30, pool_timeout=30, and pool_pre_ping=True.
- Foreign key columns must have database indexes for efficient JOIN operations. Currently products.category_id, reviews.product_id, and inventory.product_id lack indexes, causing PostgreSQL to perform sequential scans on every join. Add index=True to these columns - EXPLAIN ANALYZE should show "Index Scan" instead of "Seq Scan".
- Products.is_active column must be indexed since it's used in WHERE clauses for filtering. Currently every query with .filter(Product.is_active == True) scans the entire products table. With 100K+ products, this alone adds 200ms+ to query time.
- Frequently accessed product listings must be cached in Redis with 60-second TTL. Currently identical requests made seconds apart both hit the database. The GET /products endpoint with same parameters should return from cache in under 10ms on subsequent requests.
- Database operations must be converted from synchronous to async using AsyncSession and async_sessionmaker. The current synchronous Session blocks the entire thread during database I/O, limiting concurrency. With async, the same server can handle 3-5x more concurrent requests.
- Pagination must use cursor-based (keyset) approach instead of OFFSET. Current implementation uses query.offset(skip).limit(limit) which becomes extremely slow for large offsets - page 500 requires scanning 10,000 rows first. Use WHERE id > last_seen_id ORDER BY id LIMIT 20 instead, ensuring consistent performance regardless of page number.
- Total count query must not perform full table scan on every request. Currently query.count() scans all rows to calculate total pages - for 1 million products this takes 500ms+ per request. Either cache the count with 60-second TTL or use PostgreSQL's estimate from pg_class.reltuples which returns instantly.
- JSON response payloads must be compressed using GZip for responses larger than 1KB. Current uncompressed response for 20 products with reviews is 450KB. Add GZipMiddleware with minimum_size=1000 - compressed payload should be under 100KB (70-80% reduction).
- Batch fetch endpoint get_products_by_ids must use a single IN query instead of looping. Current implementation calls get_product() inside a for-loop, executing N queries for N product IDs. Use db.query(Product).filter(Product.id.in_(product_ids)) to fetch all products in one query.
- Database sessions must be properly closed even when exceptions occur. Current get_db dependency may leak connections if errors happen before the finally block. Ensure all database operations use proper context managers and verify connection pool returns to baseline after errors.
- Conditional HTTP caching must be implemented with ETag headers. Currently clients receive full response body even when data hasn't changed. Add ETag based on content hash - when client sends If-None-Match header matching current ETag, return HTTP 304 Not Modified with empty body.
- Request duration must be logged for every endpoint to identify performance bottlenecks. Add middleware that measures time from request start to response completion and logs method, path, and duration. Flag any requests exceeding 200ms threshold for investigation.

## Metadata
- Programming Languages: Javascript
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
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
