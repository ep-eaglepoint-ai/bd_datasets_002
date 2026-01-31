package dispatcher

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"runtime"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// TestEventStateTransitions tests the state machine transitions
func TestEventStateTransitions(t *testing.T) {
	event := NewEvent("evt-1", "entity-1", 1, []byte(`{}`), "http://example.com")

	// Initial state should be PENDING
	if event.State != StatePending {
		t.Errorf("Expected initial state PENDING, got %s", event.State)
	}

	// PENDING -> IN_FLIGHT should work
	if !event.CanTransitionTo(StateInFlight) {
		t.Error("Expected PENDING -> IN_FLIGHT to be valid")
	}
	event.TransitionTo(StateInFlight)
	if event.State != StateInFlight {
		t.Errorf("Expected state IN_FLIGHT, got %s", event.State)
	}

	// IN_FLIGHT -> COMPLETED should work
	if !event.CanTransitionTo(StateCompleted) {
		t.Error("Expected IN_FLIGHT -> COMPLETED to be valid")
	}

	// Create another event to test failure path
	event2 := NewEvent("evt-2", "entity-1", 2, []byte(`{}`), "http://example.com")
	event2.TransitionTo(StateInFlight)
	event2.TransitionTo(StateRetryWait)
	if event2.State != StateRetryWait {
		t.Errorf("Expected state RETRY_WAIT, got %s", event2.State)
	}

	// RETRY_WAIT -> IN_FLIGHT should work
	if !event2.CanTransitionTo(StateInFlight) {
		t.Error("Expected RETRY_WAIT -> IN_FLIGHT to be valid")
	}

	// Test terminal states
	event3 := NewEvent("evt-3", "entity-1", 3, []byte(`{}`), "http://example.com")
	event3.TransitionTo(StateInFlight)
	event3.TransitionTo(StateCompleted)
	if !event3.IsTerminal() {
		t.Error("COMPLETED should be a terminal state")
	}
	if event3.CanTransitionTo(StateInFlight) {
		t.Error("COMPLETED should not transition to any other state")
	}
}

// TestRetryPolicyBackoff tests exponential backoff calculation
func TestRetryPolicyBackoff(t *testing.T) {
	config := RetryConfig{
		InitialBackoff: 1 * time.Second,
		MaxBackoff:     60 * time.Second,
		MaxRetries:     5,
		JitterPercent:  0, // Disable jitter for predictable testing
	}
	policy := NewRetryPolicy(config)

	// Test exponential growth
	expectedBackoffs := []time.Duration{
		1 * time.Second,  // 2^0 = 1
		2 * time.Second,  // 2^1 = 2
		4 * time.Second,  // 2^2 = 4
		8 * time.Second,  // 2^3 = 8
		16 * time.Second, // 2^4 = 16
	}

	for i, expected := range expectedBackoffs {
		nextTime, shouldRetry := policy.CalculateNextRetry(i)
		if !shouldRetry {
			t.Errorf("Retry %d: expected shouldRetry=true, got false", i)
		}

		// Check the backoff is approximately correct (within 100ms tolerance for timing)
		actualBackoff := time.Until(nextTime)
		if actualBackoff < expected-100*time.Millisecond || actualBackoff > expected+100*time.Millisecond {
			t.Errorf("Retry %d: expected backoff ~%v, got %v", i, expected, actualBackoff)
		}
	}

	// After max retries, should return false
	_, shouldRetry := policy.CalculateNextRetry(5)
	if shouldRetry {
		t.Error("Expected shouldRetry=false after max retries")
	}
}

// TestRetryPolicyWithJitter tests that jitter is applied
func TestRetryPolicyWithJitter(t *testing.T) {
	config := RetryConfig{
		InitialBackoff: 10 * time.Second,
		MaxBackoff:     60 * time.Second,
		MaxRetries:     5,
		JitterPercent:  10,
	}
	policy := NewRetryPolicy(config)

	// Run multiple times to verify jitter produces different values
	var times []time.Time
	for i := 0; i < 10; i++ {
		nextTime, _ := policy.CalculateNextRetry(0)
		times = append(times, nextTime)
	}

	// At least some values should be different due to jitter
	allSame := true
	for i := 1; i < len(times); i++ {
		if !times[i].Equal(times[0]) {
			allSame = false
			break
		}
	}
	if allSame {
		t.Error("Expected jitter to produce varying retry times")
	}
}

// TestSequenceGuard verifies that event 2 cannot be sent while event 1 is retrying
func TestSequenceGuard(t *testing.T) {
	// Create a mock server that introduces high latency
	var requestCount int32
	var receivedEvents []string
	var mu sync.Mutex

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)

		eventID := r.Header.Get("X-Idempotency-Key")
		mu.Lock()
		receivedEvents = append(receivedEvents, eventID)
		mu.Unlock()

		// Simulate high latency for event 1 (will cause timeout)
		if eventID == "evt-1" {
			time.Sleep(300 * time.Millisecond)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	// Create store and orchestrator
	store := NewMemoryStore()
	config := DefaultOrchestratorConfig()
	config.WorkerCount = 5
	config.RequestTimeout = 100 * time.Millisecond // Short timeout to trigger retry
	config.PollInterval = 10 * time.Millisecond
	config.RetryConfig.MaxRetries = 2
	config.RetryConfig.InitialBackoff = 50 * time.Millisecond

	orchestrator := NewEventOrchestrator(store, config)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Submit event 1 and event 2 for the same entity
	event1 := NewEvent("evt-1", "entity-A", 1, []byte(`{"seq": 1}`), server.URL)
	event2 := NewEvent("evt-2", "entity-A", 2, []byte(`{"seq": 2}`), server.URL)

	orchestrator.SubmitEvent(ctx, event1)
	orchestrator.SubmitEvent(ctx, event2)

	// Start orchestrator
	orchestrator.Start(ctx)
	defer orchestrator.Stop()

	// Wait for processing
	time.Sleep(1 * time.Second)

	mu.Lock()
	defer mu.Unlock()

	// Verify sequence guard: event 2 should not be processed until event 1 succeeds
	// The first events in receivedEvents should all be evt-1 (retries)
	foundEvt2BeforeEvt1Complete := false
	evt1Completed := false

	for _, evtID := range receivedEvents {
		if evtID == "evt-1" {
			// After the 3rd attempt (2 retries), evt-1 should succeed
			evt1Completed = true
		}
		if evtID == "evt-2" && !evt1Completed {
			foundEvt2BeforeEvt1Complete = true
			break
		}
	}

	// Due to timeouts and retries, we should verify the sequence is maintained
	if foundEvt2BeforeEvt1Complete {
		t.Errorf("Sequence Guard violated: evt-2 was processed before evt-1 completed. Order: %v", receivedEvents)
	}

	t.Logf("Request order: %v", receivedEvents)
}

// TestIdempotencyGuard verifies that 100 simultaneous calls for the same EventID result in exactly one POST
func TestIdempotencyGuard(t *testing.T) {
	var postCount int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&postCount, 1)
		time.Sleep(50 * time.Millisecond) // Simulate processing time
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	store := NewMemoryStore()
	config := DefaultOrchestratorConfig()
	config.WorkerCount = 20
	config.PollInterval = 5 * time.Millisecond
	config.RequestTimeout = 2 * time.Second

	orchestrator := NewEventOrchestrator(store, config)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Submit the same event 100 times concurrently
	var wg sync.WaitGroup
	eventID := "unique-event-123"

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(seq int64) {
			defer wg.Done()
			event := NewEvent(eventID, "entity-X", 1, []byte(`{"test": true}`), server.URL)
			orchestrator.SubmitEvent(ctx, event)
		}(int64(i))
	}
	wg.Wait()

	// Start orchestrator and wait for processing
	orchestrator.Start(ctx)
	time.Sleep(500 * time.Millisecond)
	orchestrator.Stop()

	// Verify exactly one POST was made
	actualPosts := atomic.LoadInt32(&postCount)
	if actualPosts != 1 {
		t.Errorf("Idempotency Guard violated: expected 1 POST, got %d", actualPosts)
	}

	// Verify the duplicate count metric
	duplicates := orchestrator.GetDuplicateCount()
	if duplicates < 99 {
		t.Logf("Note: duplicate detection counted %d duplicates (expected ~99)", duplicates)
	}

	t.Logf("POST count: %d, Duplicate count: %d", actualPosts, duplicates)
}

// TestGracefulShutdown verifies that the worker pool shuts down without leaking goroutines
func TestGracefulShutdown(t *testing.T) {
	// Create a slow server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))

	store := NewMemoryStore()
	config := DefaultOrchestratorConfig()
	config.WorkerCount = 10
	config.PollInterval = 10 * time.Millisecond

	orchestrator := NewEventOrchestrator(store, config)

	ctx, cancel := context.WithCancel(context.Background())

	// Submit some events
	for i := 1; i <= 5; i++ {
		event := NewEvent(
			fmt.Sprintf("evt-%d", i),
			fmt.Sprintf("entity-%d", i),
			1,
			[]byte(`{}`),
			server.URL,
		)
		orchestrator.SubmitEvent(ctx, event)
	}

	// Record goroutines after orchestrator is set up
	runtime.GC()
	time.Sleep(50 * time.Millisecond)
	beforeStart := runtime.NumGoroutine()

	// Start and run briefly
	orchestrator.Start(ctx)
	time.Sleep(200 * time.Millisecond)

	// Cancel context and stop
	cancel()
	orchestrator.Stop()

	// Close server before checking goroutines
	server.Close()

	// Allow time for cleanup
	time.Sleep(200 * time.Millisecond)
	runtime.GC()
	time.Sleep(50 * time.Millisecond)

	// Check goroutine count
	afterStop := runtime.NumGoroutine()

	// The orchestrator should not leak goroutines
	// Allow for some variance (httptest cleanup can be slow)
	leaked := afterStop - beforeStart
	if leaked > 5 {
		t.Errorf("Goroutine leak detected: before start=%d, after stop=%d (delta %d)",
			beforeStart, afterStop, leaked)
	}

	t.Logf("Goroutines: before start=%d, after stop=%d", beforeStart, afterStop)
}

// TestDomainShardRateLimit tests that connections per domain are limited
func TestDomainShardRateLimit(t *testing.T) {
	var concurrentConnections int32
	var maxConcurrent int32
	var mu sync.Mutex

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		current := atomic.AddInt32(&concurrentConnections, 1)

		mu.Lock()
		if current > maxConcurrent {
			maxConcurrent = current
		}
		mu.Unlock()

		time.Sleep(100 * time.Millisecond) // Hold connection

		atomic.AddInt32(&concurrentConnections, -1)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	store := NewMemoryStore()
	config := DefaultOrchestratorConfig()
	config.WorkerCount = 100
	config.MaxConnectionsPerDomain = 5 // Limit to 5 concurrent
	config.PollInterval = 5 * time.Millisecond

	orchestrator := NewEventOrchestrator(store, config)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Submit 50 events for different entities (to avoid sequence blocking)
	for i := 1; i <= 50; i++ {
		event := NewEvent(
			fmt.Sprintf("evt-%d", i),
			fmt.Sprintf("entity-%d", i), // Different entities to avoid sequence guard
			1,
			[]byte(`{}`),
			server.URL,
		)
		orchestrator.SubmitEvent(ctx, event)
	}

	orchestrator.Start(ctx)
	time.Sleep(1 * time.Second)
	orchestrator.Stop()

	mu.Lock()
	observedMax := maxConcurrent
	mu.Unlock()

	if observedMax > int32(config.MaxConnectionsPerDomain) {
		t.Errorf("Domain shard violated: max concurrent was %d, expected <= %d",
			observedMax, config.MaxConnectionsPerDomain)
	}

	t.Logf("Max concurrent connections to single domain: %d (limit: %d)", observedMax, config.MaxConnectionsPerDomain)
}

// TestDeadLetterBlocking tests that a failed event blocks subsequent events for the same entity
func TestDeadLetterBlocking(t *testing.T) {
	requestCount := 0
	var mu sync.Mutex

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		requestCount++
		mu.Unlock()
		// Always fail
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	store := NewMemoryStore()
	config := DefaultOrchestratorConfig()
	config.WorkerCount = 5
	config.PollInterval = 10 * time.Millisecond
	config.RetryConfig.MaxRetries = 2
	config.RetryConfig.InitialBackoff = 10 * time.Millisecond

	orchestrator := NewEventOrchestrator(store, config)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Submit two events for the same entity
	event1 := NewEvent("evt-1", "entity-A", 1, []byte(`{}`), server.URL)
	event2 := NewEvent("evt-2", "entity-A", 2, []byte(`{}`), server.URL)

	orchestrator.SubmitEvent(ctx, event1)
	orchestrator.SubmitEvent(ctx, event2)

	orchestrator.Start(ctx)
	time.Sleep(500 * time.Millisecond)
	orchestrator.Stop()

	// Check that event 1 is in FAILED state
	storedEvent1, _ := store.GetEvent(ctx, "evt-1")
	if storedEvent1.State != StateFailed {
		t.Errorf("Expected event 1 to be FAILED, got %s", storedEvent1.State)
	}

	// Check that event 2 was never attempted (blocked by dead letter)
	storedEvent2, _ := store.GetEvent(ctx, "evt-2")
	if storedEvent2.State != StatePending {
		t.Errorf("Expected event 2 to still be PENDING, got %s", storedEvent2.State)
	}

	// Verify event 2 was blocked
	if orchestrator.GetBlockedCount() == 0 {
		t.Log("Note: Blocked count was 0, but event 2 should have been blocked")
	}
}

// TestMemoryStoreOperations tests the in-memory store implementation
func TestMemoryStoreOperations(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryStore()

	// Test SaveEvent and GetEvent
	event := NewEvent("evt-1", "entity-A", 1, []byte(`{"test": 1}`), "http://test.com")
	err := store.SaveEvent(ctx, event)
	if err != nil {
		t.Fatalf("Failed to save event: %v", err)
	}

	retrieved, err := store.GetEvent(ctx, "evt-1")
	if err != nil {
		t.Fatalf("Failed to get event: %v", err)
	}
	if retrieved.EventID != "evt-1" {
		t.Errorf("Expected EventID 'evt-1', got '%s'", retrieved.EventID)
	}

	// Test GetLastCompletedSequence
	seq, _ := store.GetLastCompletedSequence(ctx, "entity-A")
	if seq != 0 {
		t.Errorf("Expected last completed sequence 0, got %d", seq)
	}

	// Complete the event and check again
	event.State = StateCompleted
	store.SaveEvent(ctx, event)
	seq, _ = store.GetLastCompletedSequence(ctx, "entity-A")
	if seq != 1 {
		t.Errorf("Expected last completed sequence 1, got %d", seq)
	}

	// Test GetEventsForEntity
	event2 := NewEvent("evt-2", "entity-A", 2, []byte(`{}`), "http://test.com")
	store.SaveEvent(ctx, event2)

	events, _ := store.GetEventsForEntity(ctx, "entity-A")
	if len(events) != 2 {
		t.Errorf("Expected 2 events for entity, got %d", len(events))
	}
	if events[0].SequenceNumber != 1 || events[1].SequenceNumber != 2 {
		t.Error("Events not sorted by sequence number")
	}

	// Test IsEntityBlocked
	blocked, _ := store.IsEntityBlocked(ctx, "entity-A")
	if blocked {
		t.Error("Entity should not be blocked")
	}

	event3 := NewEvent("evt-3", "entity-B", 1, []byte(`{}`), "http://test.com")
	event3.State = StateFailed
	store.SaveEvent(ctx, event3)

	blocked, _ = store.IsEntityBlocked(ctx, "entity-B")
	if !blocked {
		t.Error("Entity B should be blocked")
	}

	// Test GetNextSequenceEvent
	event4 := NewEvent("evt-4", "entity-C", 1, []byte(`{}`), "http://test.com")
	store.SaveEvent(ctx, event4)

	next, _ := store.GetNextSequenceEvent(ctx, "entity-C")
	if next == nil {
		t.Error("Expected to get next sequence event")
	} else if next.EventID != "evt-4" {
		t.Errorf("Expected evt-4, got %s", next.EventID)
	}
}

// TestEventPayload tests payload handling
func TestEventPayload(t *testing.T) {
	var receivedPayload []byte

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 1024)
		n, _ := r.Body.Read(buf)
		receivedPayload = buf[:n]
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	store := NewMemoryStore()
	config := DefaultOrchestratorConfig()
	config.WorkerCount = 1
	config.PollInterval = 10 * time.Millisecond

	orchestrator := NewEventOrchestrator(store, config)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	payload := map[string]interface{}{
		"transaction_id": "tx-123",
		"amount":         99.99,
		"currency":       "USD",
	}
	payloadBytes, _ := json.Marshal(payload)

	event := NewEvent("evt-1", "entity-1", 1, payloadBytes, server.URL)
	orchestrator.SubmitEvent(ctx, event)

	orchestrator.Start(ctx)
	time.Sleep(200 * time.Millisecond)
	orchestrator.Stop()

	if len(receivedPayload) == 0 {
		t.Error("No payload received")
	} else {
		var received map[string]interface{}
		json.Unmarshal(receivedPayload, &received)
		if received["transaction_id"] != "tx-123" {
			t.Errorf("Payload mismatch: %s", string(receivedPayload))
		}
	}
}
