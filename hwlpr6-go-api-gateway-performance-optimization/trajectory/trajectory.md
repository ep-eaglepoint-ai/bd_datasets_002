# Trajectory (Go API Gateway Performance Optimization)

## Audit the Original Code (Identify Scaling Problems)

I audited the original gateway middleware and handlers. The pipeline relied on each middleware and the proxy handler reading the request body independently via `io.ReadAll(r.Body)`, causing repeated I/O and CPU spikes under concurrency. A global unbounded slice (`requestLogs`) grew without bound during sustained load, and the rate limiter’s client map had no eviction, risking unbounded memory growth. There was no body size limit, so oversized requests could exhaust memory or overload backends.

## 1. Define a Performance Contract First

I defined strict correctness and stability conditions: the gateway must read the request body only once and make it available to all middleware and handlers; P99 latency must stay under 50ms at 2000 concurrent requests; memory must stay under 500MB and return to baseline after load; CPU utilization must stay under 70% at peak; and all existing middleware behavior (auth, rate limit, logging, validation, compression, metrics, proxy) must be preserved. Invalid or oversized input must be rejected with predictable HTTP status codes (e.g. 413 for bodies over 10MB) without panics or goroutine leaks.

## 2. Rework the Data Model for Efficiency

I introduced a single source of truth for the request body: `BodyLimitMiddleware` reads the body once (up to 10MB), stores the bytes in the request context under `bodyContextKey`, and replaces `r.Body` with `io.NopCloser(bytes.NewReader(body))`. Downstream middleware and the proxy handler then read from this in-memory reader (or can use the context value), eliminating redundant I/O and keeping a clear, explicit data contract for “the body has already been read and bounded.”

## 3. Rebuild the Pipeline as Body-First

(Adapted to API handling.) I rebuilt the middleware chain so that body handling happens at the edge: `BodyLimitMiddleware` is registered first in `SetupGateway`. Every subsequent component (logging, validation, compression, metrics, proxy) consumes the same in-memory body via `r.Body` (or context). The application logic and backends only ever see a single, bounded, already-read body instead of each layer performing its own read from the connection.

## 4. Move Filters to the Edge (Server-Side)

(Adapted to upstream validation.) I moved size and read checks to the first middleware. `BodyLimitMiddleware` uses `io.LimitReader(r.Body, maxBodySize+1)` and rejects requests larger than 10MB with HTTP 413 before any other middleware or business logic runs. Invalid or failed reads are rejected with 400 at the gateway boundary, so invalid or oversized input never propagates into logging, auth, or proxy logic.

## 5. Use Bounded Structures Instead of Unbounded Growth

(Adapted to global resource bounds.) Instead of an unbounded `requestLogs` slice and an ever-growing rate limiter map, I introduced bounded structures: a fixed-capacity ring buffer (`requestLogBuffer`, 10,000 entries) for request logs and a cap on the rate limiter’s client map (50,000 keys) with `evictStaleClients` when the map exceeds that size. This acts as a global bound so that memory cannot grow without limit under sustained or abusive load.

## 6. Stable Ordering + Bounded Buffers

(Adapted to deterministic logic.) I fixed the unbounded growth and non-deterministic resource use. The ring buffer maintains a fixed-size sliding window of logs with deterministic eviction (oldest entry overwritten when full). The rate limiter evicts clients that have no requests in the current time window when the map size exceeds the cap, so behavior under load is predictable and memory returns to a stable baseline after traffic subsides.

## 7. Eliminate Redundant I/O (N+1 Reads)

(Adapted to eliminate inefficient reads.) I eliminated the pattern where each middleware and the proxy called `io.ReadAll(r.Body)` on the live connection. A single read is performed in `BodyLimitMiddleware`; all later reads use the replaced `r.Body` (backed by the same byte slice) or the context-stored body. This removes redundant I/O and allocations, reducing CPU and improving P99 latency under high concurrency.

## 8. Normalize for Safe Logging and Propagation

(Adapted to input normalization.) I added normalization for how the body is exposed to logging and downstream: the body in context is the single canonical value; logged bodies are truncated to `maxLogBodyBytes` (4KB) with a suffix so logs never hold full large payloads. This keeps the “canonical” body consistent for validation, metrics, and proxy while ensuring logging and in-memory usage stay bounded and safe.

## 9. Result: Measurable Performance Gains + Predictable Signals

The refactored gateway reads the body once, enforces a 10MB limit and returns 413 for oversized requests, uses bounded log and rate-limiter structures so memory stays predictable and returns to baseline, and preserves all existing middleware and API contracts. Latency and CPU improve by removing redundant I/O; behavior under load is predictable and testable (e.g. FAIL_TO_PASS and PASS_TO_PASS tests), with no panics or goroutine leaks and graceful degradation via standard HTTP status codes.
