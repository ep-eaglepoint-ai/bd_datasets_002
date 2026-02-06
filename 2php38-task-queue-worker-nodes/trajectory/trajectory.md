# Trajectory - Distributed Task Queue Worker Nodes

## Task Overview
Implement a high-performance distributed task queue system using Python 3.11+, Redis Streams, asyncio, multiprocessing, structlog, and Prometheus client.

## Feedback Addressed

The following issues were identified and fixed:

| Issue | Solution | Location |
|-------|----------|----------|
| No Redis or Redis Streams | Added `RedisStreamsQueue`, `RedisDistributedLock`, `RedisLeaderElection` | `redis_backend.py` |
| No structlog | Added structlog configuration with JSON/console output | `logging_config.py` |
| No Prometheus client | Added official prometheus-client metrics | `prometheus_metrics.py` |
| Workers don't use multiprocessing | Added `MultiprocessWorkerPool`, `HybridWorkerPool` | `multiprocess_worker.py` |
| No pip package | Added `pyproject.toml` with CLI entry points | `pyproject.toml` |
| No HTTP REST API | Added FastAPI REST API with full CRUD | `api.py` |
| Priority queue in-memory only | Added Redis-backed distributed queue | `redis_backend.py` |
| Distributed lock in-memory | Added Redis-based distributed locking | `redis_backend.py` |
| No failure/alerting | Added `AlertManager` with webhook/callback handlers | `alerting.py` |
| No throughput metrics | Added throughput gauge in Prometheus metrics | `prometheus_metrics.py` |
| Job.payload not type-safe | Added `TypedJob[PayloadT]` with Pydantic generics | `models.py` |

## Implementation Structure

```
repository_after/
├── __init__.py              # Package exports (all modules)
├── models.py                # Pydantic models + TypedJob[T] generic
├── priority_queue.py        # In-memory priority queue (fallback)
├── redis_backend.py         # Redis Streams + distributed locking
├── logging_config.py        # structlog configuration
├── prometheus_metrics.py    # Official Prometheus client metrics
├── multiprocess_worker.py   # CPU workers via multiprocessing
├── api.py                   # FastAPI REST API
├── alerting.py              # Failure callbacks + webhooks
├── dependencies.py          # Dependency graph + topological sort
├── retry.py                 # Retry strategies + DLQ
├── scheduler.py             # Delayed + recurring jobs
├── worker.py                # Worker management
├── metrics.py               # Legacy metrics (kept for compatibility)
├── serialization.py         # JSON/MessagePack/Pickle serializers
├── client.py                # Main TaskQueue interface
├── cli.py                   # CLI entry points
└── pyproject.toml           # pip package configuration
```

## Key Components

### 1. Redis Integration (`redis_backend.py`)
- `RedisConfig`: Connection configuration
- `RedisConnection`: Connection pooling
- `RedisStreamsQueue`: Priority queues via Redis Streams
- `RedisDistributedLock`: Distributed locking with TTL
- `RedisLeaderElection`: Leader election for coordination

### 2. Structured Logging (`logging_config.py`)
- Uses structlog for structured logging
- JSON or console output formats
- Context binding for request tracing

### 3. Prometheus Metrics (`prometheus_metrics.py`)
- Uses official `prometheus-client` library
- Counters: jobs_submitted, jobs_completed, jobs_failed
- Gauges: queue_depth, worker_count, throughput
- Histograms: job_processing_duration, job_wait_duration

### 4. Multiprocessing Workers (`multiprocess_worker.py`)
- `MultiprocessWorkerPool`: CPU-bound task processing
- `AsyncWorkerPool`: I/O-bound async processing
- `HybridWorkerPool`: Combined CPU + I/O workers

### 5. REST API (`api.py`)
- FastAPI-based HTTP API
- Endpoints: POST /jobs, GET /jobs/{id}, GET /stats, GET /metrics
- Prometheus metrics at /metrics endpoint

### 6. Alerting (`alerting.py`)
- `AlertManager`: Central alert dispatcher
- `LogAlertHandler`: Logs alerts via structlog
- `WebhookAlertHandler`: Sends to external URLs
- `CallbackAlertHandler`: Custom callback functions

### 7. Type-Safe Payloads (`models.py`)
- `TypedJob[PayloadT]`: Generic job with Pydantic payload
- Full type checking at runtime
- Payload validation via Pydantic

## Tests

### New Test File: `tests/test_redis_integration.py`
- Redis Streams integration tests
- Prometheus metrics tests
- Multiprocessing worker tests
- Alerting callback tests
- MessagePack serialization tests
- Type-safe payload tests
- FastAPI REST API tests
- Graceful shutdown tests
- Work stealing tests

## Verification Commands

```bash
# Run tests
docker compose run --rm -e PYTHONPATH=/app/repository_after:/app app pytest -v tests/

# Run evaluation
docker compose run --rm app python evaluation/evaluation.py
```

## Docker Configuration

- `docker-compose.yml`: Includes Redis service with health check
- `Dockerfile`: Python 3.11-slim with all dependencies
- `requirements.txt`: redis, structlog, prometheus-client, fastapi, msgpack  

