# EFW4UN - Go API Gateway Middleware Chain Performance Optimization

**Category:** sft

## Overview
- Task ID: EFW4UN
- Title: Go API Gateway Middleware Chain Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: efw4un-go-api-gateway-middleware-chain-performance-optimization

## Requirements
- Fix LoggingMiddleware to restore request body after reading so downstream handlers can read it. Use io.NopCloser with bytes.NewReader or bytes.NewBuffer.
- Fix ProxyHandler to close response body after reading using defer resp.Body.Close() to prevent file descriptor leaks.
- Add mutex protection to RateLimiter to prevent race conditions when multiple goroutines access the tokens map concurrently.
- Implement cleanup mechanism in RateLimiter to remove stale IP entries and prevent unbounded memory growth.
- Configure HTTPClient with custom http.Transport settings for connection pooling: MaxIdleConns, MaxIdleConnsPerHost, and IdleConnTimeout.
- Propagate request context to proxy requests using http.NewRequestWithContext so backend requests cancel when client disconnects.
- Check for client disconnection in ProxyHandler by monitoring r.Context().Done() before and during request processing.
- Use io.Copy to stream response body instead of io.ReadAll to prevent memory bloat with large responses.
- Remove unnecessary JSON unmarshaling from responseRecorder.Write method that was causing overhead on every response.
- Add TLSHandshakeTimeout and ExpectContinueTimeout to http.Transport for proper timeout handling.
- Extract IP address from RemoteAddr correctly by removing the port suffix for consistent rate limiting.
- Ensure all error paths properly close request and response bodies to prevent resource leaks.
- Consider adding server-level timeouts (ReadTimeout, WriteTimeout, IdleTimeout) to prevent slow clients from holding connections.
- Implement graceful shutdown handling using signal notification and server.Shutdown with context timeout.
- Add log truncation for large request/response bodies to prevent memory issues during logging.
- Verify rate limiter token bucket algorithm correctly refills tokens based on elapsed time with proper synchronization.
- Test under sustained load of 500+ requests per second to verify p99 latency stays under 100ms.
- Run 1-hour load test to verify no file descriptor leaks (stable open file count).
- Monitor memory usage during load test to confirm it stabilizes after warmup period.
- Verify request body is available to all middleware in the chain by testing with POST requests containing JSON payloads.

## Metadata
- Programming Languages: Go
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
