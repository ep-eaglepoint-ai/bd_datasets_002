package lease

import (
	"context"
	"errors"
	"sync"
	"time"
)

type KeyValueStore interface {
	PutIfAbsent(ctx context.Context, key string, val []byte, ttl time.Duration) (int64, bool, error)
	CompareAndSwap(ctx context.Context, key string, oldRevision int64, newVal []byte) (bool, error)
	CompareAndDelete(ctx context.Context, key string, oldRevision int64) (bool, error)
	Watch(ctx context.Context, key string) <-chan struct{}
	Get(ctx context.Context, key string) ([]byte, int64, error)
}

type Lease struct {
	Token   int64
	Context context.Context
	release func() error
}

func (l *Lease) Release() error {
	return l.release()
}

type LeaseOrchestrator struct {
	store    KeyValueStore
	clientID string
	ttl      time.Duration
}

func NewLeaseOrchestrator(store KeyValueStore, clientID string, ttl time.Duration) *LeaseOrchestrator {
	return &LeaseOrchestrator{
		store:    store,
		clientID: clientID,
		ttl:      ttl,
	}
}

func (lo *LeaseOrchestrator) AcquireAndHold(ctx context.Context, resourceID string) (*Lease, error) {
	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		// 1. Try to Acquire (Linearizable). Only if this fails do we
		// register a watcher, so we don't leak watch channels when we
		// successfully obtain the lease.
		rev, success, err := lo.store.PutIfAbsent(ctx, resourceID, []byte(lo.clientID), lo.ttl)
		if err != nil {
			// Backoff on transient errors in a context-aware way to avoid
			// hammering the store during outages, while still respecting
			// the caller's deadline.
			backoff := 50 * time.Millisecond
			maxBackoff := 500 * time.Millisecond
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff):
			}
			if backoff < maxBackoff {
				backoff *= 2
				if backoff > maxBackoff {
					backoff = maxBackoff
				}
			}
			continue
		}

		if success {
			// Acquired -> Setup Heartbeat
			workerCtx, workerCancel := context.WithCancel(ctx)
			stopHeartbeat := make(chan struct{})
			var wg sync.WaitGroup
			wg.Add(1)

			go func() {
				defer wg.Done()
				lo.heartbeatLoop(workerCtx, workerCancel, resourceID, rev, stopHeartbeat)
			}()

			return &Lease{
				Token:   rev,
				Context: workerCtx,
				release: func() error {
					close(stopHeartbeat) // Signal stop
					wg.Wait()            // Wait for shutdown (Graceful Handover)

					// Atomic Release
					delCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
					defer cancel()

					ok, err := lo.store.CompareAndDelete(delCtx, resourceID, rev)
					if err != nil { return err }
					if !ok { return errors.New("lease lost during release") }
					return nil
				},
			}, nil
		}

		// 3. Lock Busy. Register a watcher and block until the key
		// changes, or our context is canceled. This avoids polling
		// while ensuring we don't leave unused watchers behind when
		// acquisition succeeds.
		watchCh := lo.store.Watch(ctx, resourceID)
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-watchCh:
			// Event received, retry immediately
			continue
		}
	}
}

func (lo *LeaseOrchestrator) heartbeatLoop(ctx context.Context, cancelWorker context.CancelFunc, key string, rev int64, stop <-chan struct{}) {
	defer cancelWorker()

	// Renew at 1/3 TTL
	renewInterval := lo.ttl / 3
	// Fail-fast at 50% TTL
	safetyWindow := lo.ttl / 2

	// lastSuccess tracks the last time we *successfully* renewed or
	// acquired the lease. We start at acquisition time so the first
	// renewal measures from that event.
	lastSuccess := time.Now()

	// helper performs a single renewal attempt with capped exponential
	// backoff and safety-window enforcement. It returns true if the
	// lease is still valid, or false if we should revoke it.
	renewOnce := func() bool {
		// Fail-fast if we've already exceeded the safety window.
		if time.Since(lastSuccess) > safetyWindow {
			return false
		}

		retryBackoff := 50 * time.Millisecond
		maxBackoff := 500 * time.Millisecond

		for {
			// Abort if we've run out of safety budget.
			if time.Since(lastSuccess) > safetyWindow {
				return false
			}

			select {
			case <-stop:
				return false
			case <-ctx.Done():
				return false
			default:
			}

			reqCtx, cancel := context.WithTimeout(ctx, 200*time.Millisecond)
			success, err := lo.store.CompareAndSwap(reqCtx, key, rev, []byte(lo.clientID))
			cancel()

			if err == nil {
				if success {
					lastSuccess = time.Now()
					return true
				}
				// revision mismatch -> lease was stolen; revoke immediately
				return false
			}

			// transient error: back off (capped) but stay within safety window
			select {
			case <-stop:
				return false
			case <-ctx.Done():
				return false
			case <-time.After(retryBackoff):
			}

			retryBackoff *= 2
			if retryBackoff > maxBackoff {
				retryBackoff = maxBackoff
			}
		}
	}

	// Perform an immediate heartbeat after acquisition so that any
	// post-acquisition partitions are detected promptly, rather than
	// waiting for the first ticker interval.
	if !renewOnce() {
		return
	}

	ticker := time.NewTicker(renewInterval)
	defer ticker.Stop()

	for {
		select {
		case <-stop:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			if !renewOnce() {
				return
			}
		}
	}
}