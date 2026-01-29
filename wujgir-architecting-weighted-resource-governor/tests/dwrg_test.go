package tests

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/eaglepoint/dwrg/repository_after"
)

// SafeMockStorage is a thread-safe in-memory implementation of AtomicStorage.
type SafeMockStorage struct {
	mu   sync.Mutex
	data map[string]int64
}

func NewSafeMockStorage() *SafeMockStorage {
	return &SafeMockStorage{
		data: make(map[string]int64),
	}
}

func (s *SafeMockStorage) Get(ctx context.Context, key string) (int64, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	val, ok := s.data[key]
	return val, ok, nil
}

func (s *SafeMockStorage) CompareAndSwap(ctx context.Context, key string, old, new int64) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	val, ok := s.data[key]
	if !ok {
		// If current does not exist, we demand old == 0 (assumption for CAS on new key)
		if old == 0 {
			s.data[key] = new
			return true, nil
		}
		return false, nil
	}
	
	if val == old {
		s.data[key] = new
		return true, nil
	}
	return false, nil
}

func TestHeaderBasedCostResolution(t *testing.T) {
	store := NewSafeMockStorage()
	gov := dwrg.NewResourceGovernor(store, 10, 100)

	// Register generic route
	gov.RegisterRoute("GET", "/api/v1/resource", 10, nil)
	
	// Register specific header route (lower cost for VIP)
	gov.RegisterRoute("GET", "/api/v1/resource", 5, map[string]string{"X-User-Type": "VIP"})
	
	ctx := context.Background()
	tenant := "tenant_cost"
	
	// Case 1: Standard request (Cost 10)
	// Capacity 100. Should allow 10 requests exactly.
	for i := 0; i < 10; i++ {
		allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/api/v1/resource", nil)
		if !allowed {
			t.Fatalf("Standard req %d should be allowed", i)
		}
	}
	// 11th should fail
	allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/api/v1/resource", nil)
	if allowed {
		t.Fatal("Standard req 11 should be denied")
	}

	// Reset tenant
	tenant = "tenant_cost_vip"

	// Case 2: VIP request (Cost 5)
	// Capacity 100. Should allow 20 requests.
	headers := map[string]string{"X-User-Type": "VIP"}
	for i := 0; i < 20; i++ {
		allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/api/v1/resource", headers)
		if !allowed {
			t.Fatalf("VIP req %d should be allowed", i)
		}
	}
	// 21st should fail
	allowed, _, _, _ = gov.Allow(ctx, tenant, "GET", "/api/v1/resource", headers)
	if allowed {
		t.Fatal("VIP req 21 should be denied")
	}
}

func TestBurstAndMilliSecondPrecision(t *testing.T) {
	store := NewSafeMockStorage()
	// Rate: 100 tokens/sec. 1 token = 10ms.
	// Burst: 10. Max burst duration = 100ms.
	gov := dwrg.NewResourceGovernor(store, 100, 10)
	ctx := context.Background()
	tenant := "tenant_precision"
	
	// 1. Consume 10 tokens (Burst capacity)
	for i := 0; i < 10; i++ {
		allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/default", nil)
		if !allowed {
			t.Fatalf("Request %d should be allowed", i)
		}
	}
	
	// 2. Immediate next should fail
	allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/default", nil)
	if allowed {
		t.Fatal("Should be exhausted")
	}
	
	// 3. Wait 15ms (should refill 1 token, as 10ms is 1 token)
	time.Sleep(15 * time.Millisecond)
	
	allowed, _, _, _ = gov.Allow(ctx, tenant, "GET", "/default", nil)
	if !allowed {
		t.Fatal("Should have refilled 1 token")
	}
	
	// 4. Immediate should fail again
	allowed, _, _, _ = gov.Allow(ctx, tenant, "GET", "/default", nil)
	if allowed {
		t.Fatal("Should be exhausted again")
	}
}

func TestCooldownCalculation(t *testing.T) {
	store := NewSafeMockStorage()
	// Rate 1/sec. Burst 5.
	// 1 token = 1 second.
	gov := dwrg.NewResourceGovernor(store, 1, 5)
	ctx := context.Background()
	tenant := "tenant_cooldown"

	// Register cost 5
	gov.RegisterRoute("GET", "/heavy", 5, nil)
	
	// Consume all (Cost 5 consumes full burst)
	allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/heavy", nil)
	if !allowed {
		t.Fatal("First request should pass")
	}
	
	// Try again immediately. We need 5 tokens.
	// We have 0 tokens. Rate 1/sec. We need 5 seconds to refill 5 tokens.
	// Wait should be ~5 seconds.
	allowed, _, wait, _ := gov.Allow(ctx, tenant, "GET", "/heavy", nil)
	if allowed {
		t.Fatal("Should be denied")
	}
	
	// Check wait time with small margin
	if wait < 4900*time.Millisecond || wait > 5100*time.Millisecond {
		t.Errorf("Expected wait ~5s, got %v", wait)
	}
}

func TestConcurrencyStressStrict(t *testing.T) {
	// "Stress test where 100 goroutines simulate a single tenant attempting to exhaust a quota"
	store := NewSafeMockStorage()
	capacity := int64(1000)
	rate := float64(100)
	gov := dwrg.NewResourceGovernor(store, rate, capacity) // 100/s rate, 1000 burst
	
	ctx := context.Background()
	tenant := "tenant_stress"
	
	var wg sync.WaitGroup
	var allowedCount int32
	var deniedCount int32
	
	concurrency := 100
	requestsPerRoutine := 30 
	// Total 3000 requests. Capacity 1000. 
	
	start := make(chan struct{})
	startTime := time.Now()
	
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			for j := 0; j < requestsPerRoutine; j++ {
				// Cost 1
				allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/stress", nil)
				if allowed {
					atomic.AddInt32(&allowedCount, 1)
				} else {
					atomic.AddInt32(&deniedCount, 1)
				}
				// Tiny sleep to spread out slightly but maintain high contention
				time.Sleep(time.Duration(rand.Intn(10)+1) * time.Microsecond)
			}
		}()
	}
	
	close(start)
	wg.Wait()
	duration := time.Since(startTime)
	
	fmt.Printf("Stress Test: Allowed %d, Denied %d. Duration %v\n", allowedCount, deniedCount, duration)

	// Strict Calculation:
	// Allowed <= InitialBurst + (Duration * Rate)
	// We allow a tiny Epsilon for float math, but it should be very strict.
	refillDuringTest := int64(duration.Seconds() * rate)
	maxAllowed := capacity + refillDuringTest + 1 // +1 for boundary jitter

	if int64(allowedCount) > maxAllowed {
		t.Errorf("VIOLATION: Allowed %d > MaxAllowed %d (Capacity %d + Refill %d)", 
			allowedCount, maxAllowed, capacity, refillDuringTest)
	}

	if deniedCount == 0 {
		t.Error("Should have denied significant number of requests")
	}
}

func TestPriorityThrottling(t *testing.T) {
	// "Verify that high-cost requests are throttled significantly earlier than low-cost requests"
	store := NewSafeMockStorage()
	gov := dwrg.NewResourceGovernor(store, 10, 100)
	
	gov.RegisterRoute("GET", "/heavy", 50, nil)
	gov.RegisterRoute("GET", "/light", 1, nil)
	
	tenant := "tenant_prio"
	ctx := context.Background()
	
	// 1. Heavy requests
	cnt := 0
	for {
		allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/heavy", nil)
		if !allowed {
			break
		}
		cnt++
	}
	if cnt != 2 {
		t.Errorf("Expected exactly 2 heavy requests (Cost 50, Cap 100), got %d", cnt)
	}
	
	// 2. Light requests
	tenant2 := "tenant_light"
	cnt = 0
	for {
		allowed, _, _, _ := gov.Allow(ctx, tenant2, "GET", "/light", nil)
		if !allowed {
			break
		}
		cnt++
	}
	if cnt != 100 {
		t.Errorf("Expected exactly 100 light requests (Cost 1, Cap 100), got %d", cnt)
	}
}
