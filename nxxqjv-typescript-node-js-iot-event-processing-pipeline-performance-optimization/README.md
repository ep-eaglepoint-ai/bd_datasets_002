# NXXQJV - TypeScript Node.js IoT Event Processing Pipeline Performance Optimization

**Category:** sft

## Overview
- Task ID: NXXQJV
- Title: TypeScript Node.js IoT Event Processing Pipeline Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: nxxqjv-typescript-node-js-iot-event-processing-pipeline-performance-optimization

## Requirements
- Database connections must use a connection pool instead of creating new Client instances per query. Currently each insertEvent() call creates a new pg.Client(), connects, runs query, and disconnects - this connection overhead limits throughput to ~500 writes/second and exhausts database connection slots under load. A Pool with max 20 connections should handle 5000+ writes/second.
- Database writes must be batched instead of inserting one row at a time. Currently the worker calls insertEvent() for each individual event which executes separate INSERT statements. For 10,000 events thats 10,000 round trips to the database. Batch 500-1000 events into a single multi-row INSERT statement to achieve 10x throughput improvement.
- Duplicate events must be prevented when jobs retry after failure. Currently if a job fails after inserting the event but before marking complete, the retry inserts the same event again. Add ON CONFLICT (event_id) DO NOTHING to the INSERT statement or add unique constraint on event_id column.
- WebSocket connections must be cleaned up when clients disconnect. Currently the clients Set adds connections on open but never removes them on close - after 1000 connect/disconnect cycles theres still 1000 dead references in memory. Add clients.delete(ws) in both the close and error event handlers.
- EventEmitter listener accumulation must be fixed to prevent memory leak warning. Currently eventEmitter.on('event_processed') is called inside setupWebSocket but listeners are never removed. Either use once() for one-time handlers or call setMaxListeners() with appropriate value and ensure proper cleanup.
- Queue must implement backpressure to reject new events when overloaded. Currently addEventToQueue() blindly adds jobs regardless of queue depth - when queue exceeds 10,000 items events start dropping silently. Check getWaitingCount() before adding and return 503 Service Unavailable when threshold exceeded.
- Batch event addition must use addBulk() instead of looping through add(). Currently addEventsToQueue() loops through events array calling eventQueue.add() for each one - this means 1000 separate Redis commands for a 1000-event batch causing CPU spikes. Use eventQueue.addBulk() to add all jobs in single Redis transaction.
- Worker concurrency must be increased from default of 1. Currently BullMQ Worker processes one job at a time sequentially which cannot achieve 10K events/second target. Set concurrency option to 10-50 based on available CPU cores to enable parallel processing.
- WebSocket broadcast must stringify JSON once instead of per-client. Currently broadcastEvent() calls JSON.stringify() inside the forEach loop meaning same object serialized 100 times for 100 clients. Stringify once before the loop and send the same string buffer to all clients.
- Graceful shutdown must drain queue and complete in-flight requests before exiting. Currently process.on('SIGTERM') calls process.exit(0) immediately which drops all in-flight requests and abandons jobs mid-processing. Must stop accepting new requests, wait for queue to drain, close database pool, close WebSocket server, then exit.
- Worker job processor must have proper error handling to prevent crashes. Currently unhandled rejection in the async job callback crashes the entire Node process. Wrap the processor function in try/catch, log the error, and let the job fail gracefully without taking down the service.
- Health check endpoint must report unhealthy when queue is overloaded. Currently /health always returns {status: healthy} even when queue depth is 50,000 and database is unreachable. Check queue depth and database connectivity - return 503 with {status: unhealthy} when degraded so load balancer stops routing traffic.
- Large batch JSON parsing must not block the event loop. Currently Express json() middleware parses entire request body synchronously - a 5MB batch payload blocks event loop for 200-500ms causing all other requests to stall. Use streaming JSON parser or move parsing to worker thread for payloads over 1MB.
- Request timeout must be configured to prevent hanging requests. Currently no timeout is set so when database is slow, requests hang indefinitely consuming connection slots. Add timeout middleware that returns 504 Gateway Timeout after 30 seconds.
- Jobs must use event_id as jobId for idempotent queue operations. Currently jobs are added with auto-generated IDs which means same event can be queued multiple times during retries. Pass {jobId: event.event_id} to add() so BullMQ deduplicates automatically.
- Database circuit breaker should fail fast when database is down. Currently when database becomes unavailable every request waits for connection timeout (30+ seconds) before failing. After 5 consecutive failures, open circuit and return 503 immediately for 30 seconds before attempting reconnection.
- Metrics endpoint should expose processing statistics for monitoring. Currently no visibility into events/second, queue depth, processing latency, or memory usage. Add /metrics or /stats endpoint returning total_processed, total_failed, queue_depth, events_per_second, and memory_usage_mb.

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
