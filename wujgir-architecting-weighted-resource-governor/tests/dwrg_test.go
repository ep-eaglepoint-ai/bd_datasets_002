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

// MockAtomicStorage is an in-memory implementation of AtomicStorage for testing.
type MockAtomicStorage struct {
	data sync.Map
}

func NewMockAtomicStorage() *MockAtomicStorage {
	return &MockAtomicStorage{}
}

func (s *MockAtomicStorage) Get(ctx context.Context, key string) (int64, bool, error) {
	val, ok := s.data.Load(key)
	if !ok {
		return 0, false, nil
	}
	return val.(int64), true, nil
}

func (s *MockAtomicStorage) CompareAndSwap(ctx context.Context, key string, old, new int64) (bool, error) {
	// Simulate CAS
	// If old is 0, we expect it to not exist or be 0.
	actual, loaded := s.data.LoadOrStore(key, new)
	if !loaded {
		// Stored successfully (did not exist)
		if old == 0 {
			return true, nil
		}
		
		// Revert the store check
		if old != 0 {

		}
		return true, nil
	}
	
	// Loaded existing value
	actualInt := actual.(int64)
	if actualInt == old {
		// Match, try to swap
		return s.data.CompareAndSwap(key, old, new), nil
	}
	return false, nil
}

// Better Mock with Mutex for CAS simulation
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

func TestCostResolution(t *testing.T) {
	store := NewSafeMockStorage()
	gov := dwrg.NewResourceGovernor(store, 10, 100)

	gov.RegisterRoute("GET", "/api/v1/heavy", 50)
	gov.RegisterRoute("GET", "/api/v1/light", 1)
	gov.RegisterRoute("GET", "/api/v1/", 5) // Prefix match
	
	ctx := context.Background()
	tenant := "tenant_cost"
	
	// Req 1
	allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/api/v1/heavy")
	if !allowed {
		t.Fatal("First heavy request should be allowed")
	}
	
	// Req 2
	allowed, _, _, _ = gov.Allow(ctx, tenant, "GET", "/api/v1/heavy")
	if !allowed {
		t.Fatal("Second heavy request should be allowed")
	}
	
	// Req 3 (Should fail)
	allowed, _, _, _ = gov.Allow(ctx, tenant, "GET", "/api/v1/heavy")
	if allowed {
		t.Fatal("Third heavy request should be denied (100 capacity / 50 cost = 2 requests)")
	}
}

func TestBurstAndRefill(t *testing.T) {
	store := NewSafeMockStorage()
	// Rate: 10 tokens/sec. Burst: 20.
	gov := dwrg.NewResourceGovernor(store, 10, 20)
	ctx := context.Background()
	tenant := "tenant_refill"
	
	// Consume 20 (Full burst)
	for i := 0; i < 20; i++ {
		allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/default") // cost 1
		if !allowed {
			t.Fatalf("Request %d should be allowed", i)
		}
	}
	
	// Next reject
	allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/default")
	if allowed {
		t.Fatal("Should be exhausted")
	}
	
	// Wait 0.5s -> should refill 5 tokens
	time.Sleep(500 * time.Millisecond)
	
	// Should allow 5
	for i := 0; i < 5; i++ {
		allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/default")
		if !allowed {
			t.Fatalf("Refill request %d should be allowed", i)
		}
	}
	// Next reject
	allowed, _, _, _ = gov.Allow(ctx, tenant, "GET", "/default")
	if allowed {
		t.Fatal("Should be exhausted again after refill consumption")
	}
}

func TestCooldownCalculation(t *testing.T) {
	store := NewSafeMockStorage()
	gov := dwrg.NewResourceGovernor(store, 1, 10) // 1 token/sec, 10 burst
	ctx := context.Background()
	tenant := "tenant_cooldown"

	// Register cost 10
	gov.RegisterRoute("GET", "/heavy", 10)
	
	// Consume all
	gov.Allow(ctx, tenant, "GET", "/heavy")
	
	// Try again immediately
	allowed, _, wait, _ := gov.Allow(ctx, tenant, "GET", "/heavy")
	if allowed {
		t.Fatal("Should be denied")
	}
	
	// We need 10 tokens. Rate is 1/sec. Should take 10 seconds.
	// Allow some margin for execution time
	if wait < 9*time.Second || wait > 11*time.Second {
		t.Errorf("Expected wait ~10s, got %v", wait)
	}
}

func TestConcurrencyStress(t *testing.T) {
	// "Stress test where 100 goroutines simulate a single tenant attempting to exhaust a quota"
	store := NewSafeMockStorage()
	capacity := int64(1000)
	gov := dwrg.NewResourceGovernor(store, 100, capacity) // 100/s rate, 1000 burst
	
	ctx := context.Background()
	tenant := "tenant_stress"
	
	var wg sync.WaitGroup
	var allowedCount int32
	var deniedCount int32
	
	concurrency := 100
	requestsPerRoutine := 20
	
	start := make(chan struct{})
	
	// Total requests = 2000. Capacity = 1000. Refill is negligible during fast test execution (100/s).
	// We expect roughly 1000 passes (plus maybe a few from refill if it takes > 10ms, but execution is fast).
	
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			for j := 0; j < requestsPerRoutine; j++ {
				// Default cost 1
				allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/stress")
				if allowed {
					atomic.AddInt32(&allowedCount, 1)
				} else {
					atomic.AddInt32(&deniedCount, 1)
				}
				// Small sleep to randomise
				time.Sleep(time.Duration(rand.Intn(100)) * time.Microsecond)
			}
		}()
	}
	
	close(start)
	wg.Wait()
	
	fmt.Printf("Stress Test: Allowed %d, Denied %d (Total %d)\n", allowedCount, deniedCount, allowedCount+deniedCount)

	if allowedCount > int32(capacity)+200 { // Allow some refill margin
		t.Errorf("Allowed count %d seems too high for capacity %d", allowedCount, capacity)
	}
	if deniedCount == 0 {
		t.Error("Should have denied some requests")
	}
}

func TestPriorityThrottling(t *testing.T) {
	// "Verify that high-cost requests are throttled significantly earlier than low-cost requests"
	store := NewSafeMockStorage()
	gov := dwrg.NewResourceGovernor(store, 10, 100)
	
	gov.RegisterRoute("GET", "/heavy", 50)
	gov.RegisterRoute("GET", "/light", 1)
	
	tenant := "tenant_prio"
	ctx := context.Background()
	
	// 1. Heavy requests
	// Can verify we get 2
	cnt := 0
	for {
		allowed, _, _, _ := gov.Allow(ctx, tenant, "GET", "/heavy")
		if !allowed {
			break
		}
		cnt++
	}
	if cnt != 2 {
		t.Errorf("Expected 2 heavy requests, got %d", cnt)
	}
	
	// Reset tenant state (easiest way is new tenant or wait, but waiting is slow. New tenant.)
	tenant2 := "tenant_prio_light"
	cnt = 0
	for {
		allowed, _, _, _ := gov.Allow(ctx, tenant2, "GET", "/light")
		if !allowed {
			break
		}
		cnt++
	}
	if cnt != 100 {
		t.Errorf("Expected 100 light requests, got %d", cnt)
	}
}
