# Trajectory

1.  **Code Audit & Bottleneck Detection**: I started by analyzing the existing codebase to identify performance bottlenecks and security vulnerabilities. I noticed that the API key authentication was using `make_password` which is computationally expensive and incorrect for verification. Found N+1 query issues in list endpoints where related data (owners, tasks) was being fetched individually. Also identified that the `PageNumberPagination` would become slow with large offsets as the dataset grows.
    *   Resources: [Django Performance Optimization](https://docs.djangoproject.com/en/4.2/topics/performance/), [Django Debug Toolbar usage](https://django-debug-toolbar.readthedocs.io/en/latest/)

2.  **Performance Contract & SLOs**: I defined the performance verification plan using `pytest-django` and `CaptureQueriesContext`. I established a constraint that list endpoints must have a constant number of queries regardless of result size (O(1) query count). For pagination, I decided to switch to cursor-based pagination to ensure consistent O(1) database access time for any page, avoiding the linear scan required by offset pagination.
    *   Resources: [Cursor Pagination benefits](https://www.django-rest-framework.org/api-guide/pagination/#cursorpagination), [Query counting in tests](https://docs.djangoproject.com/en/4.2/topics/testing/tools/#assertions)

3.  **Data Model & Query Optimization**: I optimized the `AuditLog` model to be immutable for security and performance (append-only log). I refactored the `TenantManager` and `TenantMiddleware` to ensure robust row-level security at the database query level, automatically filtering all queries by `organization_id`. This prevents accidental data leaks and pushes filtering to the database index.
    *   Resources: [Django Multi-tenancy strategies](https://books.agiliq.com/projects/django-multi-tenant/en/latest/), [PostgreSQL Indicies](https://www.postgresql.org/docs/current/indexes.html)

4.  **Query Refactoring (Hot Paths)**: I targeted the high-traffic list endpoints (`/projects/` and `/tasks/`). I implemented `select_related` and `prefetch_related` in the ViewSets to fetch related Organization and User data in a single query. I also replaced `PageNumberPagination` with `CursorPagination` in `core/pagination.py` to optimize deep pagination performance on large tables.
    *   Resources: [Django N+1 Problem](https://scoutapm.com/blog/django-n-plus-one-queries), [DRF Performance](https://www.django-rest-framework.org/api-guide/performance/)

5.  **Verification & Load Testing**: I created a comprehensive test suite covering all performance constraints. I wrote specific tests (`test_performance.py`) that insert varying amounts of data (5 vs 15 records) and assert that the query count remains identical. I also added tests for the cursor pagination to ensure it correctly preserves ordering and efficiency without the N+1 overhead of the previous implementation.
    *   Resources: [Pytest Django](https://pytest-django.readthedocs.io/en/latest/), [Testing Query Counts](https://adamj.eu/tech/2020/05/20/the-unreasonable-effectiveness-of-django-capturequeriescontext/)

6.  **Observability & Metrics**: I added detailed audit logging (`core/signals.py`) to track *what* changed (old vs new values) rather than just that *something* changed. I ensured this logging logic was optimized to avoid unnecessary DB hits during normal operations. I validated the solution using a Dockerized test environment to ensure reproducible performance results across different environments.
    *   Resources: [Django Signals](https://docs.djangoproject.com/en/4.2/topics/signals/), [12 Factor App - Logs](https://12factor.net/logs)
