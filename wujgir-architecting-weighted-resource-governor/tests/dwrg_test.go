package tests

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	dwrg "github.com/eaglepoint/dwrg/repository_after"
)

// MockAtomicStorage is an in-memory implementation of AtomicStorage for testing.
type MockAtomicStorage struct {
	data sync.Map
	mu   sync.Mutex
}

func NewMockAtomicStorage() *MockAtomicStorage {
	return &MockAtomicStorage{}
}

func (s *MockAtomicStorage) Get(ctx context.Context, key string) (int64, bool, error) {
	if ctx.Err() != nil {
		return 0, false, ctx.Err()
	}
	val, ok := s.data.Load(key)
	if !ok {
		return 0, false, nil
	}
	return val.(int64), true, nil
}

func (s *MockAtomicStorage) CompareAndSwap(ctx context.Context, key string, old, new int64) (bool, error) {
	if ctx.Err() != nil {
		return false, ctx.Err()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	val, ok := s.data.Load(key)
	if !ok {
		if old == 0 {
			s.data.Store(key, new)
			return true, nil
		}
		return false, nil
	}
	if val.(int64) != old {
		return false, nil
	}
	s.data.Store(key, new)
	return true, nil
}

func (s *MockAtomicStorage) AtomicIncrement(ctx context.Context, key string, delta int64) (int64, error) {
	if ctx.Err() != nil {
		return 0, ctx.Err()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	val, _ := s.data.LoadOrStore(key, int64(0))
	current := val.(int64)
	newVal := current + delta
	s.data.Store(key, newVal)
	return newVal, nil
}

// ============================================================================
// Requirement 1: Cost Resolution Engine Tests
// ============================================================================

func TestCostEngine_HeaderBasedResolution(t *testing.T) {
	engine := dwrg.NewCostResolutionEngine()

	// Register routes with headers - signature: (method, path, headers, cost)
	engine.Register("GET", "/api/data", nil, 10)
	engine.Register("GET", "/api/data", map[string]string{"X-Priority": "high"}, 5)
	engine.Register("GET", "/api/data", map[string]string{"X-Priority": "low"}, 20)

	tests := []struct {
		name     string
		method   string
		path     string
		headers  map[string]string
		expected int64
	}{
		{"No headers - base cost", "GET", "/api/data", nil, 10},
		{"High priority header", "GET", "/api/data", map[string]string{"X-Priority": "high"}, 5},
		{"Low priority header", "GET", "/api/data", map[string]string{"X-Priority": "low"}, 20},
		{"Unknown priority - falls to base", "GET", "/api/data", map[string]string{"X-Priority": "medium"}, 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost := engine.Resolve(tt.method, tt.path, tt.headers)
			if cost != tt.expected {
				t.Errorf("expected cost %d, got %d", tt.expected, cost)
			}
		})
	}
}

func TestCostEngine_MostSpecificMatch(t *testing.T) {
	engine := dwrg.NewCostResolutionEngine()

	// Register in arbitrary order - should still match most specific
	engine.Register("GET", "/api/", nil, 1)
	engine.Register("GET", "/api/users", nil, 5)
	engine.Register("GET", "/api/users/{id}", nil, 10)
	engine.Register("GET", "/api/users/{id}/profile", nil, 15)
	engine.Register("", "/api/admin", nil, 100) // Any method

	tests := []struct {
		name     string
		method   string
		path     string
		expected int64
	}{
		{"Prefix match", "GET", "/api/anything", 1},
		{"Exact match wins over prefix", "GET", "/api/users", 5},
		{"Path param match", "GET", "/api/users/123", 10},
		{"Longer path param match", "GET", "/api/users/123/profile", 15},
		{"Wildcard method match", "POST", "/api/admin", 100},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost := engine.Resolve(tt.method, tt.path, nil)
			if cost != tt.expected {
				t.Errorf("expected cost %d, got %d", tt.expected, cost)
			}
		})
	}
}

func TestCostEngine_WildcardMatch(t *testing.T) {
	engine := dwrg.NewCostResolutionEngine()

	engine.Register("GET", "/api/*", nil, 5)
	engine.Register("GET", "/api/v1/*", nil, 10)

	tests := []struct {
		path     string
		expected int64
	}{
		{"/api/anything", 5},
		{"/api/v1/users", 10},
		{"/api/v1/users/123", 10},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			cost := engine.Resolve("GET", tt.path, nil)
			if cost != tt.expected {
				t.Errorf("expected cost %d, got %d", tt.expected, cost)
			}
		})
	}
}

func TestCostEngine_MultipleHeadersSpecificity(t *testing.T) {
	engine := dwrg.NewCostResolutionEngine()

	// More headers = more specific
	engine.Register("GET", "/api/data", nil, 10)
	engine.Register("GET", "/api/data", map[string]string{"X-Tenant": "acme"}, 15)
	engine.Register("GET", "/api/data", map[string]string{"X-Tenant": "acme", "X-Priority": "high"}, 20)

	// Request with both headers should match most specific (2 headers)
	cost := engine.Resolve("GET", "/api/data", map[string]string{"X-Tenant": "acme", "X-Priority": "high"})
	if cost != 20 {
		t.Errorf("expected cost 20 for 2-header match, got %d", cost)
	}

	// Request with one header should match 1-header rule
	cost = engine.Resolve("GET", "/api/data", map[string]string{"X-Tenant": "acme"})
	if cost != 15 {
		t.Errorf("expected cost 15 for 1-header match, got %d", cost)
	}
}

// ============================================================================
// Requirement 2: Distributed State Management Tests
// ============================================================================

func TestStateManager_ExactlyOnceDeduction(t *testing.T) {
	storage := NewMockAtomicStorage()
	gov := dwrg.NewResourceGovernor(storage, 1000, 100) // 1000/sec, 100 burst

	// RegisterRoute signature: (method, path string, cost int64, headers map[string]string)
	gov.RegisterRoute("GET", "/test", 1, nil)

	ctx := context.Background()
	tenantID := "tenant-exact-once"

	// Make exactly 100 requests (burst capacity)
	success := 0
	for i := 0; i < 100; i++ {
		allowed, _, _, err := gov.Allow(ctx, tenantID, "GET", "/test", nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if allowed {
			success++
		}
	}

	if success != 100 {
		t.Errorf("expected exactly 100 successes, got %d", success)
	}

	// 101st request must fail
	allowed, _, _, _ := gov.Allow(ctx, tenantID, "GET", "/test", nil)
	if allowed {
		t.Errorf("101st request should have been rejected")
	}
}

func TestStressTest_StrictLimits_NoOvershoot(t *testing.T) {
	storage := NewMockAtomicStorage()
	burstCapacity := int64(1000)
	gov := dwrg.NewResourceGovernor(storage, 100, burstCapacity) // 100/sec, 1000 burst

	gov.RegisterRoute("GET", "/test", 1, nil)

	ctx := context.Background()
	tenantID := "tenant-stress"

	var successCount int64
	var wg sync.WaitGroup
	goroutines := 100

	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < 50; j++ { // Each goroutine tries 50 times
				allowed, _, _, _ := gov.Allow(ctx, tenantID, "GET", "/test", nil)
				if allowed {
					atomic.AddInt64(&successCount, 1)
				}
			}
		}()
	}

	wg.Wait()

	// STRICT: No jitter allowed - must be exactly <= burstCapacity
	if successCount > burstCapacity {
		t.Errorf("STRICT LIMIT VIOLATION: expected at most %d successes, got %d (overshoot: %d)",
			burstCapacity, successCount, successCount-burstCapacity)
	}

	t.Logf("Strict limit test: %d/%d allowed (headroom: %d)", successCount, burstCapacity, burstCapacity-successCount)
}

func TestDistributedNodes_StrictGlobalLimit(t *testing.T) {
	// Simulate multiple nodes sharing the same storage
	sharedStorage := NewMockAtomicStorage()
	burstCapacity := int64(500)
	refillRate := 100.0

	numNodes := 5
	governors := make([]*dwrg.ResourceGovernor, numNodes)
	for i := 0; i < numNodes; i++ {
		governors[i] = dwrg.NewResourceGovernor(sharedStorage, refillRate, burstCapacity)
		governors[i].RegisterRoute("GET", "/test", 1, nil)
	}

	ctx := context.Background()
	tenantID := "tenant-distributed"

	var successCount int64
	var wg sync.WaitGroup

	// Each "node" runs concurrent requests
	for nodeID := 0; nodeID < numNodes; nodeID++ {
		wg.Add(1)
		go func(gov *dwrg.ResourceGovernor) {
			defer wg.Done()
			for j := 0; j < 200; j++ {
				allowed, _, _, _ := gov.Allow(ctx, tenantID, "GET", "/test", nil)
				if allowed {
					atomic.AddInt64(&successCount, 1)
				}
			}
		}(governors[nodeID])
	}

	wg.Wait()

	// All nodes share the same global limit
	if successCount > burstCapacity {
		t.Errorf("DISTRIBUTED LIMIT VIOLATION: expected at most %d, got %d", burstCapacity, successCount)
	}

	t.Logf("Distributed test (%d nodes): %d/%d allowed", numNodes, successCount, burstCapacity)
}

// ============================================================================
// Requirement 3: Variable Refill / Burst-to-Sustain Tests
// ============================================================================

func TestBurstToSustain_IdleAccumulation(t *testing.T) {
	storage := NewMockAtomicStorage()
	refillRate := 10.0 // 10 tokens/sec
	burstCapacity := int64(50)

	gov := dwrg.NewResourceGovernor(storage, refillRate, burstCapacity)
	gov.RegisterRoute("GET", "/test", 1, nil)

	ctx := context.Background()
	tenantID := "tenant-burst"

	// Exhaust initial burst
	for i := 0; i < 50; i++ {
		gov.Allow(ctx, tenantID, "GET", "/test", nil)
	}

	// Verify exhausted
	allowed, _, _, _ := gov.Allow(ctx, tenantID, "GET", "/test", nil)
	if allowed {
		t.Error("expected rejection after exhausting burst")
	}

	// Wait for refill (1 second = 10 tokens)
	time.Sleep(1100 * time.Millisecond)

	// Should now have ~10 tokens available
	successCount := 0
	for i := 0; i < 15; i++ {
		allowed, _, _, _ := gov.Allow(ctx, tenantID, "GET", "/test", nil)
		if allowed {
			successCount++
		}
	}

	// Should allow approximately 10-11 requests (refilled amount)
	if successCount < 9 || successCount > 12 {
		t.Errorf("expected ~10 requests after 1s refill, got %d", successCount)
	}

	t.Logf("Burst-to-Sustain: After 1s idle, allowed %d requests", successCount)
}

// ============================================================================
// Requirement 4: Cooldown Calculation Tests
// ============================================================================

func TestCooldown_ReflectsCostAndVelocity(t *testing.T) {
	storage := NewMockAtomicStorage()
	refillRate := 10.0 // 10 tokens/sec -> 100ms per token
	burstCapacity := int64(10)

	gov := dwrg.NewResourceGovernor(storage, refillRate, burstCapacity)
	gov.RegisterRoute("GET", "/small", 1, nil)
	gov.RegisterRoute("GET", "/large", 5, nil)

	ctx := context.Background()
	tenantID := "tenant-cooldown"

	// Exhaust the burst
	for i := 0; i < 10; i++ {
		gov.Allow(ctx, tenantID, "GET", "/small", nil)
	}

	// Try a small request (cost=1) - should get ~100ms cooldown
	_, _, waitSmall, _ := gov.Allow(ctx, tenantID, "GET", "/small", nil)

	// Try a large request (cost=5) - should get ~500ms cooldown
	_, _, waitLarge, _ := gov.Allow(ctx, tenantID, "GET", "/large", nil)

	// Verify large cost has proportionally larger cooldown
	if waitLarge <= waitSmall {
		t.Errorf("expected large-cost wait (%v) > small-cost wait (%v)", waitLarge, waitSmall)
	}

	// Verify cooldown is roughly proportional to cost
	// Large cost (5) should be ~5x the small cost (1)
	ratio := float64(waitLarge) / float64(waitSmall)
	if ratio < 4.0 || ratio > 6.0 {
		t.Errorf("expected cooldown ratio ~5x, got %.2fx", ratio)
	}

	t.Logf("Cooldown: small=%v, large=%v, ratio=%.2f", waitSmall, waitLarge, ratio)
}

func TestCooldown_ConsistentWithRefillVelocity(t *testing.T) {
	storage := NewMockAtomicStorage()
	refillRate := 100.0 // 100 tokens/sec -> 10ms per token
	burstCapacity := int64(10)

	gov := dwrg.NewResourceGovernor(storage, refillRate, burstCapacity)
	gov.RegisterRoute("GET", "/test", 1, nil)

	ctx := context.Background()
	tenantID := "tenant-velocity"

	// Exhaust burst
	for i := 0; i < 10; i++ {
		gov.Allow(ctx, tenantID, "GET", "/test", nil)
	}

	// Get cooldown
	_, _, wait, _ := gov.Allow(ctx, tenantID, "GET", "/test", nil)

	// Should be approximately 10ms (1 token / 100 per sec)
	expectedWait := 10 * time.Millisecond
	tolerance := 5 * time.Millisecond

	if wait < expectedWait-tolerance || wait > expectedWait+tolerance {
		t.Errorf("expected wait ~%v, got %v", expectedWait, wait)
	}
}

// ============================================================================
// Requirement 5: Performance / Concurrency Tests
// ============================================================================

func BenchmarkAllow_SingleGoroutine(b *testing.B) {
	storage := NewMockAtomicStorage()
	gov := dwrg.NewResourceGovernor(storage, 1000000, 1000000)
	gov.RegisterRoute("GET", "/test", 1, nil)

	ctx := context.Background()
	tenantID := "bench-tenant"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		gov.Allow(ctx, tenantID, "GET", "/test", nil)
	}
}

func BenchmarkAllow_Parallel(b *testing.B) {
	storage := NewMockAtomicStorage()
	gov := dwrg.NewResourceGovernor(storage, 1000000, 1000000)
	gov.RegisterRoute("GET", "/test", 1, nil)

	ctx := context.Background()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		tenantID := fmt.Sprintf("bench-tenant-%d", rand.Int63())
		for pb.Next() {
			gov.Allow(ctx, tenantID, "GET", "/test", nil)
		}
	})
}

func BenchmarkCostEngine_Resolve(b *testing.B) {
	engine := dwrg.NewCostResolutionEngine()

	// Add many routes
	for i := 0; i < 100; i++ {
		engine.Register("GET", fmt.Sprintf("/api/v1/resource%d", i), nil, int64(i))
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine.Resolve("GET", "/api/v1/resource50", nil)
	}
}

func TestThroughput_100kChecksPerSecond(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping throughput test in short mode")
	}

	storage := NewMockAtomicStorage()
	gov := dwrg.NewResourceGovernor(storage, 1000000, 1000000)
	gov.RegisterRoute("GET", "/test", 1, nil)

	ctx := context.Background()
	numGoroutines := 100
	duration := 2 * time.Second

	var totalOps int64
	done := make(chan bool)

	start := time.Now()

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			tenantID := fmt.Sprintf("tenant-%d", id)
			for {
				select {
				case <-done:
					return
				default:
					gov.Allow(ctx, tenantID, "GET", "/test", nil)
					atomic.AddInt64(&totalOps, 1)
				}
			}
		}(i)
	}

	time.Sleep(duration)
	close(done)

	elapsed := time.Since(start)
	opsPerSecond := float64(totalOps) / elapsed.Seconds()

	t.Logf("Throughput: %.0f ops/sec over %v (%d total ops)", opsPerSecond, elapsed, totalOps)

	// Target: 100k ops/sec
	if opsPerSecond < 100000 {
		t.Errorf("Throughput below 100k ops/sec: %.0f", opsPerSecond)
	}
}

// ============================================================================
// Requirement 6: Comprehensive Validation Suite
// ============================================================================

func TestHighCostThrottledEarlierThanLowCost(t *testing.T) {
	storage := NewMockAtomicStorage()
	burstCapacity := int64(100)
	gov := dwrg.NewResourceGovernor(storage, 10, burstCapacity)

	gov.RegisterRoute("GET", "/cheap", 1, nil)
	gov.RegisterRoute("GET", "/expensive", 50, nil)

	ctx := context.Background()

	// Test with cheap requests - should allow many
	cheapTenant := "tenant-cheap"
	cheapAllowed := 0
	for i := 0; i < 200; i++ {
		allowed, _, _, _ := gov.Allow(ctx, cheapTenant, "GET", "/cheap", nil)
		if allowed {
			cheapAllowed++
		}
	}

	// Test with expensive requests - should allow fewer
	expensiveTenant := "tenant-expensive"
	expensiveAllowed := 0
	for i := 0; i < 200; i++ {
		allowed, _, _, _ := gov.Allow(ctx, expensiveTenant, "GET", "/expensive", nil)
		if allowed {
			expensiveAllowed++
		}
	}

	// Expensive requests should be throttled much earlier
	if expensiveAllowed >= cheapAllowed {
		t.Errorf("expensive requests (%d) should be throttled more than cheap (%d)",
			expensiveAllowed, cheapAllowed)
	}

	// With 100 capacity and cost=50, should allow exactly 2 expensive requests
	expectedExpensive := int(burstCapacity / 50)
	if expensiveAllowed != expectedExpensive {
		t.Errorf("expected %d expensive requests, got %d", expectedExpensive, expensiveAllowed)
	}

	t.Logf("Throttling comparison: cheap=%d, expensive=%d (expected %d)", cheapAllowed, expensiveAllowed, expectedExpensive)
}

func TestContextCancellation(t *testing.T) {
	storage := NewMockAtomicStorage()
	gov := dwrg.NewResourceGovernor(storage, 100, 100)
	gov.RegisterRoute("GET", "/test", 1, nil)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	_, _, _, err := gov.Allow(ctx, "tenant", "GET", "/test", nil)
	if err == nil {
		t.Error("expected error on cancelled context")
	}
}

func TestStorageError_Propagation(t *testing.T) {
	// Create a storage that always errors
	errStorage := &ErrorStorage{}
	gov := dwrg.NewResourceGovernor(errStorage, 100, 100)
	gov.RegisterRoute("GET", "/test", 1, nil)

	_, _, _, err := gov.Allow(context.Background(), "tenant", "GET", "/test", nil)
	if err == nil {
		t.Error("expected storage error to be propagated")
	}
}

type ErrorStorage struct{}

func (s *ErrorStorage) Get(ctx context.Context, key string) (int64, bool, error) {
	return 0, false, fmt.Errorf("simulated storage error")
}

func (s *ErrorStorage) CompareAndSwap(ctx context.Context, key string, old, new int64) (bool, error) {
	return false, fmt.Errorf("simulated storage error")
}

func (s *ErrorStorage) AtomicIncrement(ctx context.Context, key string, delta int64) (int64, error) {
	return 0, fmt.Errorf("simulated storage error")
}

func TestRemainingTokensAccuracy(t *testing.T) {
	storage := NewMockAtomicStorage()
	burstCapacity := int64(100)
	gov := dwrg.NewResourceGovernor(storage, 1000, burstCapacity)
	gov.RegisterRoute("GET", "/test", 1, nil)

	ctx := context.Background()
	tenantID := "tenant-remaining"

	// After first request, should have 99 remaining
	allowed, remaining, _, _ := gov.Allow(ctx, tenantID, "GET", "/test", nil)
	if !allowed {
		t.Error("first request should be allowed")
	}
	if remaining != 99 {
		t.Errorf("expected 99 remaining after first request, got %d", remaining)
	}

	// Consume 49 more
	for i := 0; i < 49; i++ {
		gov.Allow(ctx, tenantID, "GET", "/test", nil)
	}

	// Should have 50 remaining
	_, remaining, _, _ = gov.Allow(ctx, tenantID, "GET", "/test", nil)
	if remaining != 49 {
		t.Errorf("expected 49 remaining, got %d", remaining)
	}
}

func TestZeroCostDefaultsToOne(t *testing.T) {
	storage := NewMockAtomicStorage()
	gov := dwrg.NewResourceGovernor(storage, 1000, 100)
	// Don't register route - should default to cost=1

	ctx := context.Background()
	tenantID := "tenant-default"

	successCount := 0
	for i := 0; i < 150; i++ {
		allowed, _, _, _ := gov.Allow(ctx, tenantID, "GET", "/unknown", nil)
		if allowed {
			successCount++
		}
	}

	// Should allow exactly 100 (burst capacity) with default cost=1
	if successCount != 100 {
		t.Errorf("expected 100 successes with default cost, got %d", successCount)
	}
}
