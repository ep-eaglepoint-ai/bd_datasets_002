package lease

import (
	"context"
	"errors"
	"sync"
	"time"
)

type KeyValueStore interface {
	PutIfAbsent(ctx context.Context, key string, val []byte, ttl time.Duration) (int64, bool, error)
	CompareAndSwap(ctx context.Context, key string, oldRevision int64, newVal []byte, ttl time.Duration) (bool, error)
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

		// FIX: Watch BEFORE trying to acquire.
		// If we Watch AFTER PutIfAbsent fails, we might miss the delete event
		// if it happens in the microseconds between the two calls.
		watchCh := lo.store.Watch(ctx, resourceID)

		// 1. Try to Acquire (Linearizable)
		rev, success, err := lo.store.PutIfAbsent(ctx, resourceID, []byte(lo.clientID), lo.ttl)
		if err != nil {
			time.Sleep(100 * time.Millisecond)
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

		// 3. Lock Busy. Block on the watcher we ALREADY created. (Event-Driven)
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

	ticker := time.NewTicker(renewInterval)
	defer ticker.Stop()

	lastSuccess := time.Now()

	for {
		select {
		case <-stop:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			//Fail-Fast (Partition Detection)
			if time.Since(lastSuccess) > safetyWindow {
				return // Zombie prevention: Kill worker immediately
			}

			// Async Safety (Retry Loop)
			retryBackoff := 50 * time.Millisecond
			for time.Since(lastSuccess) < safetyWindow {
				// Check for stop signals inside retry loop
				select {
				case <-stop:
					return
				case <-ctx.Done():
					return
				default:
				}

				reqCtx, cancel := context.WithTimeout(ctx, 200*time.Millisecond)
				success, err := lo.store.CompareAndSwap(reqCtx, key, rev, []byte(lo.clientID), lo.ttl)
				cancel()

				if err == nil {
					if success {
						lastSuccess = time.Now()
						break
					} else {
						return // Token mismatch (Stolen)
					}
				}
				time.Sleep(retryBackoff)
				retryBackoff *= 2
			}
		}
	}
}