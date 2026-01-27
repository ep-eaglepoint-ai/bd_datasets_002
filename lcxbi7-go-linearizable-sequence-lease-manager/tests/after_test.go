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