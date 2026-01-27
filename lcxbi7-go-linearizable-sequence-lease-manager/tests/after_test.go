//go:build after

package main

import (
	"context"
	"fmt"
	"testing"
	"time"

	repoAfter "lcxbi7-go-linearizable-sequence-lease-manager/repository_after"
)

// TEST 1: Concurrency & Linearizability
// Validates Requirements: 1 (Fencing Tokens), 2 (Wait Queue), 7.1, 7.2
func TestRepository_After_Concurrency(t *testing.T) {
	t.Log(">>> [1/2] Testing Concurrency & Fencing Tokens (Expected to PASS) <<<")

	SharedConcurrencyTest(t, func(id int, store *MockStore) (context.Context, int64, func(), error) {
		orch := repoAfter.NewLeaseOrchestrator(store, fmt.Sprintf("worker-%d", id), 200*time.Millisecond)

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)

		lease, err := orch.AcquireAndHold(ctx, "resource-1")
		if err != nil {
			cancel()
			return nil, 0, nil, err
		}

		return lease.Context, lease.Token, func() {
			lease.Release()
			cancel()
		}, nil
	})
}

// TEST 2: Network Partition / Zombie Prevention
// Validates Heartbeat,Async Safety/Fail-Fast, Partition Handling
func TestRepository_After_ZombiePartition(t *testing.T) {
	t.Log(">>> [2/3] Testing Network Partition / Zombie Prevention (Expected to PASS) <<<")

	store := NewMockStore()
	ttl := 1 * time.Second
	orch := repoAfter.NewLeaseOrchestrator(store, "zombie-worker", ttl)

	// 1. Acquire Lock
	lease, err := orch.AcquireAndHold(context.Background(), "critical-resource")
	if err != nil {
		t.Fatalf("Acquire failed: %v", err)
	}
	t.Log("Lock acquired. Simulating network failure...")

	// 2. Simulate Network Partition
	// This makes Put/CAS calls fail or timeout
	store.SetPartition(true)

	// 3. Assert Fail-Fast (Context Cancellation)
	// Test Revoke if cannot reach store within remaining 50% of TTL.
	// TTL = 1s, Safety Window = 500ms.
	// The heartbeat runs every 333ms.
	// We expect cancellation roughly between 500ms and 800ms.

	startTime := time.Now()

	select {
	case <-lease.Context.Done():
		elapsed := time.Since(startTime)
		t.Logf("Success: Worker context canceled after %v (TTL was %v)", elapsed, ttl)

		// cancellation must occur strictly *before*
		// the TTL that a healthy node would observe.
		if elapsed >= ttl {
			t.Errorf("Safety Violation: Context canceled at or AFTER TTL expired! (elapsed=%v, ttl=%v)", elapsed, ttl)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Failure: Zombie detected! Worker context remained active indefinitely despite partition.")
	}
}

// TEST 3: Partial Write Failures
// Validates robustness against storage-layer partial writes
func TestRepository_After_PartialWriteFailures(t *testing.T) {
	t.Log(">>> [3/3] Testing Partial Write Failures (Expected to PASS) <<<")

	store := NewMockStore()
	// Enable simulated partial writes on CAS operations.
	store.SetPartialWriteMode(true)

	ttl := 1 * time.Second
	orch := repoAfter.NewLeaseOrchestrator(store, "partial-worker", ttl)

	lease, err := orch.AcquireAndHold(context.Background(), "partial-resource")
	if err != nil {
		t.Fatalf("Acquire failed under partial-write mode: %v", err)
	}

	startTime := time.Now()

	select {
	case <-lease.Context.Done():
		elapsed := time.Since(startTime)
		t.Logf("Success: Worker context canceled after %v under partial writes (TTL was %v)", elapsed, ttl)

		// Even though the store may be extending TTL internally, the
		// orchestrator must revoke the lease before the logical TTL a
		// healthy node would assume.
		if elapsed >= ttl {
			t.Errorf("Safety Violation: Context canceled at or AFTER TTL expired under partial writes (elapsed=%v, ttl=%v)", elapsed, ttl)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Failure: Worker context remained active despite repeated partial-write failures.")
	}
}

// TEST 4: Admin Preemption / Atomic Revocation
// Validates: Req 3 (CAS mismatch cancels immediately), plus the "admin preemption" scenario.
func TestRepository_After_AdminPreemptionCancelsWorker(t *testing.T) {
	t.Log(">>> [4/5] Testing Admin Preemption Cancels Worker (Expected to PASS) <<<")

	store := NewMockStore()
	ttl := 600 * time.Millisecond
	orch := repoAfter.NewLeaseOrchestrator(store, "worker", ttl)

	lease, err := orch.AcquireAndHold(context.Background(), "admin-resource")
	if err != nil {
		t.Fatalf("Acquire failed: %v", err)
	}

	// Simulate an external/admin action that overwrites the lock with a new revision.
	store.ForceOverwrite("admin-resource", []byte("admin"), ttl)

	// Heartbeat interval is ttl/3; cancellation should happen on the next renewal attempt.
	select {
	case <-lease.Context.Done():
		// ok
	case <-time.After(2 * ttl):
		t.Fatal("Expected worker context cancellation after admin preemption")
	}
}

// TEST 5: Watcher ctx cancellation + thundering herd mitigation
// Validates: Req 2 (ctx-respecting watch wait) and "no leaked watchers".
func TestRepository_After_WatchRespectsContext_AndAvoidsThunderingHerd(t *testing.T) {
	t.Log(">>> [5/5] Testing Watch Cancellation + Herd Mitigation (Expected to PASS) <<<")

	store := NewMockStore()
	ttl := 500 * time.Millisecond
	orch := repoAfter.NewLeaseOrchestrator(store, "holder", ttl)

	// Acquire and hold the lock so others must wait.
	lease, err := orch.AcquireAndHold(context.Background(), "herd-resource")
	if err != nil {
		t.Fatalf("Acquire failed: %v", err)
	}

	// 5A) ctx-canceled waiter must not leak watchers.
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Millisecond)
	defer cancel()

	beforeWatches := store.WatchCalls()
	beforePuts := store.PutIfAbsentCalls()

	waiterOrch := repoAfter.NewLeaseOrchestrator(store, "waiter", ttl)
	_, err = waiterOrch.AcquireAndHold(ctx, "herd-resource")
	if err == nil {
		t.Fatal("Expected AcquireAndHold to fail due to ctx deadline")
	}

	// Give the watcher cleanup goroutine time to remove itself.
	deadline := time.Now().Add(400 * time.Millisecond)
	for time.Now().Before(deadline) {
		if store.ActiveWatchers() == 0 {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	if store.ActiveWatchers() != 0 {
		t.Fatalf("Watcher leak: expected 0 active watchers, got %d", store.ActiveWatchers())
	}
	if store.WatchCalls() == beforeWatches {
		t.Fatalf("Expected Watch to be used while waiting")
	}
	// While blocked, AcquireAndHold should not poll PutIfAbsent repeatedly.
	if gotDelta := store.PutIfAbsentCalls() - beforePuts; gotDelta > 2 {
		t.Fatalf("Expected no polling; too many PutIfAbsent calls while locked: delta=%d", gotDelta)
	}

	// 5B) Herd mitigation: on release, only one waiter should wake and retry quickly.
	waiters := 20
	acquiredCh := make(chan *repoAfter.Lease, waiters)
	holdCh := make(chan struct{})

	for i := 0; i < waiters; i++ {
		go func(i int) {
			wctx, wcancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer wcancel()
			worch := repoAfter.NewLeaseOrchestrator(store, fmt.Sprintf("w-%d", i), ttl)
			l, err := worch.AcquireAndHold(wctx, "herd-resource")
			if err != nil {
				return
			}
			acquiredCh <- l
			<-holdCh
			_ = l.Release()
		} (i)
	}

	// Wait until they are registered as watchers (best effort).
	deadline = time.Now().Add(600 * time.Millisecond)
	for time.Now().Before(deadline) {
		if store.ActiveWatchersForKey("herd-resource") >= waiters {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}

	putsBeforeRelease := store.PutIfAbsentCalls()
	_ = lease.Release() // free the lock

	// Within a short window, only one waiter should wake and retry PutIfAbsent.
	select {
	case <-acquiredCh:
		// ok, at least one acquired
	case <-time.After(200 * time.Millisecond):
		close(holdCh)
		t.Fatal("Expected a waiter to acquire after release")
	}

	time.Sleep(50 * time.Millisecond)
	putsAfterRelease := store.PutIfAbsentCalls()
	if delta := putsAfterRelease - putsBeforeRelease; delta > 2 {
		close(holdCh)
		t.Fatalf("Thundering herd suspected: too many immediate PutIfAbsent retries after a single release: delta=%d", delta)
	}

	// Ensure only one waiter acquired in this short window.
	if len(acquiredCh) > 0 {
		close(holdCh)
		t.Fatalf("Expected only one waiter to acquire immediately after release; got %d", 1+len(acquiredCh))
	}

	close(holdCh)
}