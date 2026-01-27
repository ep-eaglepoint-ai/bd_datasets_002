package main

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// --- Shared Mock Store ---
type entry struct {
	val []byte
	rev int64
	ttl time.Time
	// original TTL for this lease, captured on acquisition so that
	// renewals can extend based on the same duration without needing
	// a ttl parameter on CompareAndSwap.
	leaseTTL time.Duration
}

type MockStore struct {
	mu         sync.Mutex
	data       map[string]*entry
	globalRev  int64
	watchers   map[string][]chan struct{}
	partitions int32 // 0 = healthy, 1 = partitioned
	// when true, CompareAndSwap will simulate a partial write: it will
	// mutate the underlying entry but report an error back to the
	// caller, allowing tests to verify that the orchestrator fails
	// safely under such conditions.
	partialWriteMode int32
}

func NewMockStore() *MockStore {
	return &MockStore{
		data:     make(map[string]*entry),
		watchers: make(map[string][]chan struct{}),
	}
}

func (m *MockStore) SetPartition(active bool) {
	if active {
		atomic.StoreInt32(&m.partitions, 1)
	} else {
		atomic.StoreInt32(&m.partitions, 0)
	}
}

func (m *MockStore) checkPartition() error {
	if atomic.LoadInt32(&m.partitions) == 1 {
		time.Sleep(100 * time.Millisecond) // Simulate network timeout
		return errors.New("network partition")
	}
	return nil
}

// SetPartialWriteMode toggles a simulation mode where CompareAndSwap
// performs the underlying state mutation but still returns an error to
// the caller, mimicking a "partial write" failure at the storage
// layer.
func (m *MockStore) SetPartialWriteMode(active bool) {
	if active {
		atomic.StoreInt32(&m.partialWriteMode, 1)
	} else {
		atomic.StoreInt32(&m.partialWriteMode, 0)
	}
}

// --- Store Interface Implementation ---

func (m *MockStore) PutIfAbsent(ctx context.Context, key string, val []byte, ttl time.Duration) (int64, bool, error) {
	if err := m.checkPartition(); err != nil { return 0, false, err }
	m.mu.Lock(); defer m.mu.Unlock()
	m.expireLocked(key)

	if _, exists := m.data[key]; exists { return 0, false, nil }

	m.globalRev++
	now := time.Now()
	m.data[key] = &entry{val: val, rev: m.globalRev, ttl: now.Add(ttl), leaseTTL: ttl}
	return m.globalRev, true, nil
}

func (m *MockStore) CompareAndSwap(ctx context.Context, key string, oldRev int64, newVal []byte) (bool, error) {
	if err := m.checkPartition(); err != nil { return false, err }
	m.mu.Lock(); defer m.mu.Unlock()
	m.expireLocked(key)

	e, exists := m.data[key]
	if !exists || e.rev != oldRev { return false, nil }

	// Apply the value change and TTL extension first, so that when
	// partialWriteMode is enabled we still mutate state but report an
	// error back to the caller.
	e.val = newVal
	if e.leaseTTL > 0 {
		e.ttl = time.Now().Add(e.leaseTTL)
	}

	if atomic.LoadInt32(&m.partialWriteMode) == 1 {
		// Simulate a storage layer that applied the write but could not
		// confirm success to the client.
		return false, errors.New("simulated partial write")
	}

	return true, nil
}

func (m *MockStore) CompareAndDelete(ctx context.Context, key string, oldRev int64) (bool, error) {
	if err := m.checkPartition(); err != nil { return false, err }
	m.mu.Lock(); defer m.mu.Unlock()
	e, exists := m.data[key]
	if !exists || e.rev != oldRev { return false, nil }

	delete(m.data, key)
	m.notifyWatchers(key)
	return true, nil
}

func (m *MockStore) Watch(ctx context.Context, key string) <-chan struct{} {
	m.mu.Lock(); defer m.mu.Unlock()
	ch := make(chan struct{}, 1)
	m.watchers[key] = append(m.watchers[key], ch)
	return ch
}

func (m *MockStore) Get(ctx context.Context, key string) ([]byte, int64, error) { return nil, 0, nil }

func (m *MockStore) expireLocked(key string) {
	if e, exists := m.data[key]; exists {
		if time.Now().After(e.ttl) {
			delete(m.data, key)
			m.notifyWatchers(key)
		}
	}
}

func (m *MockStore) notifyWatchers(key string) {
	if list, ok := m.watchers[key]; ok {
		for _, ch := range list { close(ch) }
		delete(m.watchers, key)
	}
}

// --- Legacy Adapter (Does not import repo, just satisfies interface) ---
type LegacyStoreAdapter struct {
	*MockStore
}
func (a *LegacyStoreAdapter) CompareAndSwap(ctx context.Context, key string, oldRevision int64, newVal []byte) (bool, error) {
	// Legacy interface already matches the 4-arg signature; simply
	// forward the call to the underlying mock store.
	return a.MockStore.CompareAndSwap(ctx, key, oldRevision, newVal)
}

// --- Shared Test Logic ---
func SharedConcurrencyTest(t *testing.T, factory func(id int, store *MockStore) (context.Context, int64, func(), error)) {
	store := NewMockStore()
	// High-concurrency scenario to match requirement: 50 goroutines
	// competing for the same resource.
	workerCount := 50

	var activeWorkers int32
	var fencingTokens []int64
	var mu sync.Mutex
	var wg sync.WaitGroup

	wg.Add(workerCount)
	startCh := make(chan struct{})

	for i := 0; i < workerCount; i++ {
		go func(id int) {
			defer wg.Done()
			<-startCh

			ctx, token, release, err := factory(id, store)
			if err != nil { return }

			current := atomic.AddInt32(&activeWorkers, 1)
			if current > 1 {
				t.Errorf("[SAFETY FAIL] Mutual Exclusion Violated! %d workers hold lock simultaneously.", current)
			}

			mu.Lock()
			fencingTokens = append(fencingTokens, token)
			mu.Unlock()

			time.Sleep(20 * time.Millisecond)

			atomic.AddInt32(&activeWorkers, -1)
			release()
			_ = ctx
		}(i)
	}

	close(startCh)
	wg.Wait()

	mu.Lock()
	defer mu.Unlock()

	if len(fencingTokens) == 0 {
		t.Log("No tokens acquired (or all failed silently)")
	}

	for i := 0; i < len(fencingTokens)-1; i++ {
		if fencingTokens[i] >= fencingTokens[i+1] {
			t.Errorf("[SAFETY FAIL] Fencing Token Violation! Token %d is not > %d", fencingTokens[i+1], fencingTokens[i])
		}
	}
}