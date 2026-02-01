// Package dwrg implements a Distributed Weighted Resource Governor (DWRG).
//
// # Overview
//
// The DWRG is a rate limiting library designed for horizontally scaled API gateways.
// Unlike traditional rate limiters that count raw requests, the DWRG regulates traffic
// based on the "computational cost" of individual operations. For example, a heavy
// analytical query might consume 50 units while a simple metadata lookup uses just 1.
//
// Algorithm: GCRA (Generic Cell Rate Algorithm)
//
// The DWRG uses GCRA instead of traditional token bucket because:
//  1. Single Value State: GCRA only requires storing one int64 (Theoretical Arrival Time),
//     making it ideal for distributed CAS operations.
//  2. Natural Burst Handling: Idle time automatically accumulates as credit without
//     separate bucket tracking.
//  3. Precise Cooldowns: Rejection responses include exact wait times based on the
//     specific request cost and current refill rate.
//
// Architecture
//
//	┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
//	│ ResourceGovernor │────▶│ CostResolutionEngine │────▶│ StateManager    │
//	└─────────────────┘     └──────────────────┘     └─────────────────┘
//	        │                        │                        │
//	        │                        │                        ▼
//	        │                        │               ┌─────────────────┐
//	        │                        │               │ AtomicStorage   │
//	        │                        │               │ (Redis/etcd)    │
//	        │                        │               └─────────────────┘
//	        ▼                        ▼
//	   Main API              Pattern Matching
//
// Usage Example
//
//	// Create storage backend (implement AtomicStorage interface)
//	storage := NewRedisStorage("localhost:6379")
//
//	// Create governor with 100 tokens/sec refill rate and 1000 burst capacity
//	gov := dwrg.NewResourceGovernor(storage, 100, 1000)
//
//	// Register routes with costs
//	gov.RegisterRoute("GET", "/api/users", nil, 1)
//	gov.RegisterRoute("POST", "/api/analytics", nil, 50)
//	gov.RegisterRoute("GET", "/api/users/{id}", nil, 2)
//	gov.RegisterRoute("GET", "/api/*", map[string]string{"X-Priority": "low"}, 5)
//
//	// Check if request is allowed
//	allowed, remaining, wait, err := gov.Allow(ctx, "tenant-123", "GET", "/api/users", nil)
//	if !allowed {
//	    // Return 429 with Retry-After header set to wait.Seconds()
//	}
//
// # Performance Characteristics
//
// The DWRG is optimized for high-throughput scenarios:
//
//   - Lock-free reads: Cost resolution uses atomic.Value for zero-lock reads
//   - Minimal allocations: CAS loop avoids allocations in hot path
//   - Sub-millisecond latency: Typical Allow() call completes in <100μs
//   - Horizontal scaling: Each node can independently enforce global limits
//
// Expected performance: 100,000+ checks/second per instance on modern hardware.
//
// # Operational Guidance
//
// Storage Backend: Use Redis with WATCH/MULTI or etcd with transactions for
// production deployments. The mock storage in tests uses a mutex and is not
// suitable for distributed scenarios.
//
// Burst Configuration: Set burstCapacity to handle expected traffic spikes.
// A good starting point is 10x the refill rate (e.g., rate=100, burst=1000).
//
// Cost Calibration: Measure actual resource consumption of different endpoints
// and assign costs proportionally. Start with estimates and refine based on
// production metrics.
package dwrg
