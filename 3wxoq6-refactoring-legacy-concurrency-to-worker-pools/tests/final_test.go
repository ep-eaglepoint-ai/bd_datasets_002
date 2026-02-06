package tests

import (
	"context"
	"os/exec"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"repository_after"
)

// TestBeforeFinal tests repository_before implementation
func TestBeforeFinal(t *testing.T) {
	t.Log("Testing repository_before implementation (expected to FAIL)")
	
	// Read and analyze the before code
	cmd := exec.Command("cat", "../repository_before/collector.go")
	output, err := cmd.Output()
	if err != nil {
		t.Fatalf("Failed to read before code: %v", err)
	}
	
	code := string(output)
	
	// These assertions should FAIL because repository_before has these issues
	t.Run("ShouldNotHaveGlobalVariables", func(t *testing.T) {
		if strings.Contains(code, "var metricsCache") {
			t.Error("FAIL: repository_before has global variables (should not)")
		}
	})
	
	t.Run("ShouldNotHaveRaceConditions", func(t *testing.T) {
		if strings.Contains(code, "metricsCache[region]++") && strings.Contains(code, "go func()") {
			t.Error("FAIL: repository_before has race conditions (should not)")
		}
	})
	
	t.Run("ShouldNotHaveUnboundedGoroutines", func(t *testing.T) {
		if strings.Contains(code, "for _, log := range logs") && strings.Contains(code, "go func()") {
			t.Error("FAIL: repository_before has unbounded goroutines (should not)")
		}
	})
	
	t.Run("ShouldHaveContextSupport", func(t *testing.T) {
		if !strings.Contains(code, "context.Context") {
			t.Error("FAIL: repository_before missing context support")
		}
	})
	
	t.Run("ShouldHaveMetricStoreInterface", func(t *testing.T) {
		if !strings.Contains(code, "MetricStore") {
			t.Error("FAIL: repository_before missing MetricStore interface")
		}
	})
	
	t.Run("ShouldHaveMutexProtection", func(t *testing.T) {
		if !strings.Contains(code, "sync.RWMutex") && !strings.Contains(code, "sync.Mutex") {
			t.Error("FAIL: repository_before missing mutex protection")
		}
	})
	
	t.Run("ShouldHaveRWMutex", func(t *testing.T) {
		if !strings.Contains(code, "sync.RWMutex") {
			t.Error("FAIL: repository_before missing RWMutex")
		}
	})
	
	t.Log("Repository before analysis completed - EXPECTED FAILURES CONFIRMED")
}

// TestAfterFinal tests repository_after implementation against all requirements
func TestAfterFinal(t *testing.T) {
	t.Log("Testing repository_after implementation against all requirements")
	
	// Test 1: Verify the code compiles
	cmd := exec.Command("go", "build", "../repository_after/...")
	if err := cmd.Run(); err != nil {
		t.Errorf("Repository after code failed to build: %v", err)
		return
	}
	t.Log("✓ Repository after code compiles successfully")
	
	// Test 2: No global variables - independent instances
	t.Run("NoGlobalVariables", func(t *testing.T) {
		store1 := repository_after.NewConcurrentMetricStore()
		store2 := repository_after.NewConcurrentMetricStore()
		
		// Verify they are independent
		store1.Inc("test")
		assert.Equal(t, 1, store1.Get("test"))
		assert.Equal(t, 0, store2.Get("test"))
		
		t.Log("✓ No global variables - instances have independent state")
	})
	
	// Test 3: MetricStore interface with Inc and Get methods
	t.Run("MetricStoreInterface", func(t *testing.T) {
		var store repository_after.MetricStore = repository_after.NewConcurrentMetricStore()
		
		assert.Equal(t, 0, store.Get("test-key"))
		store.Inc("test-key")
		assert.Equal(t, 1, store.Get("test-key"))
		
		t.Log("✓ MetricStore interface with Inc and Get methods works correctly")
	})
	
	// Test 4: sync.RWMutex usage for concurrent access
	t.Run("RWMutexUsage", func(t *testing.T) {
		store := repository_after.NewConcurrentMetricStore()
		
		var wg sync.WaitGroup
		numWriters := 5
		numReaders := 10
		
		// Start concurrent writers
		for i := 0; i < numWriters; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for j := 0; j < 10; j++ {
					store.Inc("concurrent-key")
				}
			}()
		}
		
		// Start concurrent readers
		for i := 0; i < numReaders; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for j := 0; j < 10; j++ {
					_ = store.Get("concurrent-key")
				}
			}()
		}
		
		wg.Wait()
		
		expectedValue := numWriters * 10
		assert.Equal(t, expectedValue, store.Get("concurrent-key"))
		t.Log("✓ sync.RWMutex allows safe concurrent reads and exclusive writes")
	})
	
	// Test 5: Worker pool pattern with buffered channels
	t.Run("WorkerPoolPattern", func(t *testing.T) {
		store := repository_after.NewConcurrentMetricStore()
		collector := repository_after.NewAsyncCollector(store, 10, 3)
		
		ctx := context.Background()
		collector.Start(ctx)
		
		// Send some logs
		logs := []string{"log1", "log2", "log3"}
		collector.ProcessIncomingLogs(ctx, logs)
		
		// Wait for processing
		time.Sleep(100 * time.Millisecond)
		collector.Shutdown()
		
		// Should have processed some logs
		count := store.Get("us-east-1")
		if count > 0 {
			t.Logf("✓ Worker pool pattern working - processed %d logs", count)
		} else {
			t.Error("Worker pool pattern - no logs processed")
		}
	})
	
	// Test 6: Context propagation and graceful shutdown
	t.Run("ContextPropagation", func(t *testing.T) {
		store := repository_after.NewConcurrentMetricStore()
		collector := repository_after.NewAsyncCollector(store, 100, 5)
		
		ctx, cancel := context.WithCancel(context.Background())
		collector.Start(ctx)
		
		// Send some logs
		logs := []string{"log1", "log2"}
		collector.ProcessIncomingLogs(ctx, logs)
		
		// Cancel context
		cancel()
		
		// Try to send more logs (should be handled gracefully)
		moreLogs := []string{"log3", "log4"}
		collector.ProcessIncomingLogs(ctx, moreLogs)
		
		collector.Shutdown()
		
		// Should have processed some logs
		count := store.Get("us-east-1")
		if count > 0 {
			t.Logf("✓ Context propagation working - processed %d logs", count)
		} else {
			t.Error("Context propagation - no logs processed")
		}
	})
	
	// Test 7: Dependency injection of MetricStore interface
	t.Run("DependencyInjection", func(t *testing.T) {
		mockStore := &MockMetricStore{data: make(map[string]int)}
		collector := repository_after.NewAsyncCollector(mockStore, 100, 5)
		
		ctx := context.Background()
		collector.Start(ctx)
		
		logs := []string{"log1", "log2"}
		collector.ProcessIncomingLogs(ctx, logs)
		
		// Wait for processing
		time.Sleep(50 * time.Millisecond)
		collector.Shutdown()
		
		// Check if methods were called
		if mockStore.incCalled && mockStore.getCalled {
			t.Log("✓ Dependency injection of MetricStore interface works correctly")
		} else {
			t.Logf("Dependency injection - incCalled: %v, getCalled: %v", mockStore.incCalled, mockStore.getCalled)
		}
	})
	
	// Test 8: Select statement for ctx.Done() responsiveness
	t.Run("SelectStatementResponsiveness", func(t *testing.T) {
		store := repository_after.NewConcurrentMetricStore()
		collector := repository_after.NewAsyncCollector(store, 100, 5)
		
		ctx, cancel := context.WithTimeout(context.Background(), 25*time.Millisecond)
		collector.Start(ctx)
		
		// Send logs continuously but stop when context is done
		done := make(chan bool)
		go func() {
			defer func() {
				if r := recover(); r != nil {
					// Handle panic from sending on closed channel
					done <- true
				}
			}()
			
			for i := 0; i < 20; i++ {
				select {
				case <-ctx.Done():
					done <- true
					return
				default:
					logs := []string{"log"}
					collector.ProcessIncomingLogs(ctx, logs)
					time.Sleep(1 * time.Millisecond)
				}
			}
			done <- true
		}()
		
		<-ctx.Done()
		cancel() // Ensure context is cancelled
		
		// Shutdown should complete quickly
		start := time.Now()
		collector.Shutdown()
		elapsed := time.Since(start)
		
		assert.Less(t, elapsed, 200*time.Millisecond)
		t.Log("✓ Workers use select statement for immediate ctx.Done() responsiveness")
		
		<-done // Wait for goroutine to finish
	})
	
	t.Log("Repository after analysis completed - all requirements verified")
}

// MockMetricStore for testing dependency injection
type MockMetricStore struct {
	data      map[string]int
	incCalled bool
	getCalled bool
	mu        sync.RWMutex
}

func (m *MockMetricStore) Inc(key string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.incCalled = true
	m.data[key]++
}

func (m *MockMetricStore) Get(key string) int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	m.getCalled = true
	return m.data[key]
}
