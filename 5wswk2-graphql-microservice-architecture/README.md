# 5WSWK2 - graphql-microservice-architecture

**Category:** sft

## Overview
- Task ID: 5WSWK2
- Title: graphql-microservice-architecture
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 5wswk2-graphql-microservice-architecture

## Requirements
- Implement automatic schema composition from multiple subgraph services with conflict detection, support for entity references and key fields, @shareable and @override directives for field ownership, and hot-reloading of schemas when subgraphs update without gateway restart
- Build an efficient query planner that minimizes subgraph calls through batching, implements parallel execution for independent resolver paths, handles partial failures gracefully by returning available data with errors, and optimizes nested entity resolution using DataLoader patterns
- Create a flexible auth middleware supporting JWT validation with JWKS endpoints, API key authentication, and OAuth 2.0 token introspection, with field-level authorization using custom directives that integrate with external policy engines or embedded rules
- Develop WebSocket-based subscription handling with connection authentication, subscription filtering to prevent unauthorized data access, efficient fan-out for high-cardinality subscriptions, and automatic cleanup of stale connections with configurable keepalive intervals
- Design a multi-layer caching system with in-memory LRU cache for hot data, Redis-based distributed cache with TTL management, cache key generation based on query normalization and variables, and cache invalidation webhooks triggered by subgraph mutations
- Implement rate limiting using token bucket algorithm with Redis backend, supporting per-client limits based on API keys or user identity, per-operation complexity-based limits calculated from query depth and field counts, and configurable quota periods with overage handling
- Integrate OpenTelemetry for distributed tracing across subgraph calls, implement custom metrics for query complexity, resolver timing, and cache hit rates, provide a query audit log with sanitized variables for compliance, and expose a /health endpoint with subgraph connectivity status

## Metadata
- Programming Languages: TypeScript
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
