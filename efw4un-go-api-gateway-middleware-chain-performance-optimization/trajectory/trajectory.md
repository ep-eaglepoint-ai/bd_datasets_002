1. Audit the Original Gateway (Identify Bottlenecks):
   I audited the gateway and found critical issues: response bodies were being read but not restored (breaking downstream handlers), "too many open files" errors due to unclosed response bodies, and memory leaks from unbounded IP-based rate limiter maps.
   Learn about common Go performance pitfalls: [https://youtu.be/NV_mjb7eSlI?si=At2GyYyvvE1w6uWj](https://youtu.be/NV_mjb7eSlI?si=At2GyYyvvE1w6uWj)

2. Fix Race Conditions in Rate Limiter:
   The original rate limiter used non-atomic map access. I introduced `sync.Mutex` and a background cleanup loop to ensure thread-safety and bound memory usage.
   Guide on Go memory management and map safety: [https://go.dev/blog/maps](https://go.dev/blog/maps)

3. Implement Request Body Restoration:
   The logging middleware was consuming the request body. I implemented restoration using `io.NopCloser` and `bytes.NewBuffer` to ensure the proxy handler receives the full payload.

4. Fix Resource Leaks in Proxy Handler:
   Identified that `resp.Body` was never closed, leading to file descriptor exhaustion. Added `defer resp.Body.Close()` and switched to `io.Copy` for memory-efficient streaming.
   Why it's crucial to close response bodies: [https://pkg.go.dev/net/http#Client.Do](https://pkg.go.dev/net/http#Client.Do)

5. Optimize Connection Reuse:
   Configured `http.Transport` with pooling settings (`MaxIdleConns`, `MaxIdleConnsPerHost`) to handle 500+ RPS without exhausting ephemeral ports.
   Fine-tuning Go's HTTP Client: [https://medium.com/@indrajeetmishra121/tuning-the-http-client-in-go-8c6062f851d](https://medium.com/@indrajeetmishra121/tuning-the-http-client-in-go-8c6062f851d)

6. Add Graceful Shutdown and Timeouts:
   Added server-level timeouts to prevent slow-loris attacks and implemented graceful shutdown to handle active requests before exit.

7. Refactor for Testability:
   Split the `main` package into a library subpackage (`gateway`) to allow external integration and load testing in the root `tests/` directory.

8. Result: Scalable and Stable API Gateway:
   The optimized gateway now handles 500 RPS sustained with p99 latency well under 100ms, with stable memory and file descriptor counts throughout the load test.
