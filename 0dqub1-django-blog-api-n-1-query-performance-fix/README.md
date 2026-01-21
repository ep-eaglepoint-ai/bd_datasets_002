# 0DQUB1 - Django Blog API N+1 Query Performance Fix

**Category:** sft

## Overview
- Task ID: 0DQUB1
- Title: Django Blog API N+1 Query Performance Fix
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 0dqub1-django-blog-api-n-1-query-performance-fix

## Requirements
- Eliminate N+1 queries for all relationship types using appropriate select_related and prefetch_related strategies
- Reduce total query count from 2,500+ to under 10 queries for any pagination page size
- Maintain exact JSON response structure including all nested objects, counts, and field ordering
- Preserve pagination functionality with accurate counts and no query multiplication across pages
- Keep all existing filters (author, category, search) working without introducing new N+1 patterns
- Optimize ManyToMany relationships (tags) and reverse ForeignKeys (comments) with proper prefetching
- Maintain database-level aggregations for counts without replacing with Python iterations
- Ensure memory usage stays under 500MB per worker by avoiding over-eager loading
- Handle null/empty relationships (posts without categories, authors, comments) without extra queries
- Achieve sub-500ms response times for 50 posts while maintaining deterministic query order

## Metadata
- Programming Languages: Python
- Frameworks: Django
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
