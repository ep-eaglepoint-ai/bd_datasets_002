package unit_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"example.com/batch-optimized"
)

// --- Mocks & Fakes ---

type MockClock struct {
	mu      sync.Mutex
	current time.Time
	timers  []*mockTimer
}

type mockTimer struct {
	deadline time.Time
	ch       chan time.Time
	active   bool
}

func (m *mockTimer) C() <-chan time.Time { return m.ch }
func (m *mockTimer) Stop() bool {
	m.active = false
	return true
}

func NewMockClock() *MockClock {
	return &MockClock{
		current: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

func (c *MockClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.current
}

func (c *MockClock) Sleep(ctx context.Context, d time.Duration) error {
	if d == 0 {
		return nil
	}
	timer := c.NewTimer(d).(*mockTimer)
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.ch:
		return nil
	}
}

func (c *MockClock) NewTimer(d time.Duration) batch.Timer {
	c.mu.Lock()
	defer c.mu.Unlock()
	deadline := c.current.Add(d)
	timer := &mockTimer{
		deadline: deadline,
		ch:       make(chan time.Time, 1),
		active:   true,
	}
	c.timers = append(c.timers, timer)
	return timer
}

func (c *MockClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.current = c.current.Add(d)

	active := c.timers[:0]
	for _, t := range c.timers {
		if t.active {
			if !c.current.Before(t.deadline) {
				t.active = false
				select {
				case t.ch <- t.deadline:
				default:
				}
			} else {
				active = append(active, t)
			}
		}
	}
	c.timers = active
}

type MockRand struct {
	mu  sync.Mutex
	val int64
}

func (r *MockRand) Int63n(n int64) int64 {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.val % n
}

type MockDownloader struct {
	mu             sync.Mutex
	responses      map[int]string
	errs           map[int]error
	delays         map[int]time.Duration
	blockers       map[int]chan struct{}
	calls          map[int]int
	activeCalls    int32
	maxActiveCalls int32
	clock          batch.Clock
	rand           batch.Rand
}

func NewMockDownloader(clock batch.Clock, r batch.Rand) *MockDownloader {
	return &MockDownloader{
		responses: make(map[int]string),
		errs:      make(map[int]error),
		delays:    make(map[int]time.Duration),
		blockers:  make(map[int]chan struct{}),
		calls:     make(map[int]int),
		clock:     clock,
		rand:      r,
	}
}

func (d *MockDownloader) Clock() batch.Clock { return d.clock }
func (d *MockDownloader) Rand() batch.Rand   { return d.rand }

func (d *MockDownloader) Download(ctx context.Context, id int) (string, error) {
	atomic.AddInt32(&d.activeCalls, 1)
	curr := atomic.LoadInt32(&d.activeCalls)
	d.mu.Lock()
	if curr > d.maxActiveCalls {
		d.maxActiveCalls = curr
	}
	d.calls[id]++
	val, okVal := d.responses[id]
	err := d.errs[id]
	delay := d.delays[id]
	blocker, hasBlocker := d.blockers[id]
	d.mu.Unlock()

	defer atomic.AddInt32(&d.activeCalls, -1)

	if hasBlocker {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-blocker:
		}
	}

	if delay > 0 {
		d.clock.Sleep(ctx, delay)
	}

	if ctx.Err() != nil {
		return "", ctx.Err()
	}

	if !okVal && err == nil {
		return fmt.Sprintf("default_%d", id), nil
	}
	return val, err
}

type DynamicDownloader struct {
	*MockDownloader
	OnDownload func(id int) (string, error)
}

func (d *DynamicDownloader) Download(ctx context.Context, id int) (string, error) {
	d.calls[id]++
	return d.OnDownload(id)
}
