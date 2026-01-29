package unit

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"example.com/batch-optimized"
)

// FakeClock provides deterministic time control for testing
type FakeClock struct {
	mu      sync.RWMutex
	current time.Time
	timers  []*fakeTimer
}

type fakeTimer struct {
	deadline time.Time
	ch       chan struct{}
	fired    bool
}

func NewFakeClock(start time.Time) *FakeClock {
	return &FakeClock{
		current: start,
		timers:  []*fakeTimer{},
	}
}

func (f *FakeClock) Now() time.Time {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.current
}

func (f *FakeClock) Sleep(ctx context.Context, d time.Duration) error {
	f.mu.Lock()
	deadline := f.current.Add(d)
	timer := &fakeTimer{
		deadline: deadline,
		ch:       make(chan struct{}),
		fired:    false,
	}
	f.timers = append(f.timers, timer)
	f.mu.Unlock()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.ch:
		return nil
	}
}

func (f *FakeClock) Advance(d time.Duration) {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.current = f.current.Add(d)

	for _, timer := range f.timers {
		if !timer.fired && !f.current.Before(timer.deadline) {
			timer.fired = true
			close(timer.ch)
		}
	}
}

// FakeRand provides deterministic randomness for testing
type FakeRand struct {
	mu     sync.Mutex
	values []int64
	index  int
}

func NewFakeRand() *FakeRand {
	return &FakeRand{
		values: []int64{100, 200, 150, 180, 120}, // Default jitter values
	}
}

func (f *FakeRand) SetValues(values ...int64) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.values = values
	f.index = 0
}

func (f *FakeRand) Int63n(n int64) int64 {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.index >= len(f.values) {
		return 0
	}

	val := f.values[f.index] % n
	f.index++
	return val
}

// FakeDownloader provides controllable download behavior for testing
type FakeDownloader struct {
	mu          sync.Mutex
	clock       *FakeClock
	rand        *FakeRand
	responses   map[int][]downloadResponse
	callCount   map[int]int
	calls       []int
	inFlight    int32
	maxInFlight int32
}

type downloadResponse struct {
	value string
	err   error
	delay time.Duration
}

func NewFakeDownloader(clock *FakeClock, rand *FakeRand) *FakeDownloader {
	return &FakeDownloader{
		clock:     clock,
		rand:      rand,
		responses: make(map[int][]downloadResponse),
		callCount: make(map[int]int),
		calls:     []int{},
	}
}

func (f *FakeDownloader) SetResponse(id int, value string, err error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.responses[id] = []downloadResponse{{value: value, err: err}}
}

func (f *FakeDownloader) SetResponses(id int, responses []downloadResponse) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.responses[id] = responses
}

func (f *FakeDownloader) Download(ctx context.Context, id int) (string, error) {
	atomic.AddInt32(&f.inFlight, 1)
	defer atomic.AddInt32(&f.inFlight, -1)

	// Track max in-flight for rate limiting tests
	for {
		current := atomic.LoadInt32(&f.maxInFlight)
		inFlight := atomic.LoadInt32(&f.inFlight)
		if inFlight <= current {
			break
		}
		if atomic.CompareAndSwapInt32(&f.maxInFlight, current, inFlight) {
			break
		}
	}

	f.mu.Lock()
	f.calls = append(f.calls, id)
	callNum := f.callCount[id]
	f.callCount[id]++

	responses, exists := f.responses[id]
	f.mu.Unlock()

	if !exists {
		return "", fmt.Errorf("no response configured for id=%d attempt=%d", id, callNum)
	}

	// If we have multiple responses, cycle through them
	// If we have only one response, keep returning it (for cache tests)
	respIndex := callNum
	if respIndex >= len(responses) {
		if len(responses) == 1 {
			// For single response, always return it (supports caching)
			respIndex = 0
		} else {
			// For multiple responses, error if out of range
			return "", fmt.Errorf("no response configured for id=%d attempt=%d", id, callNum)
		}
	}

	resp := responses[respIndex]

	if resp.delay > 0 {
		done := make(chan struct{})
		go func() {
			f.clock.Sleep(ctx, resp.delay)
			close(done)
		}()
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-done:
		}
	}

	return resp.value, resp.err
}

func (f *FakeDownloader) Clock() batch.Clock {
	return f.clock
}

func (f *FakeDownloader) Rand() batch.Rand {
	return f.rand
}

func (f *FakeDownloader) GetCallCount(id int) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.callCount[id]
}

func (f *FakeDownloader) GetCalls() []int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]int{}, f.calls...)
}

func (f *FakeDownloader) GetMaxInFlight() int32 {
	return atomic.LoadInt32(&f.maxInFlight)
}

func (f *FakeDownloader) ResetMaxInFlight() {
	atomic.StoreInt32(&f.maxInFlight, 0)
}
