# Trajectory

1. Understood the problem statement and reviewed the repository_before implementation.
2. Identified unreliable and inefficient operations and their performance impact (N+1 queries, recursive depth errors, full-table scans, offset pagination, eager loading, and per-row deletes).
3. Researched relevant optimization patterns: N+1 mitigation (https://medium.com/databases-in-simple-words/the-n-1-database-query-problem-a-simple-explanation-and-solutions-ef11751aef8a), caching strategies (https://medium.com/@mmoshikoo/cache-strategies-996e91c80303), plus indexing, keyset pagination, and bulk delete approaches.
4. Implemented the optimized repository_after code and added tests to cover all stated requirements.
5. Updated Dockerfile and docker-compose to support the evaluation workflow.
6. Ran tests to confirm expected failures in repository_before and passes in repository_after.
