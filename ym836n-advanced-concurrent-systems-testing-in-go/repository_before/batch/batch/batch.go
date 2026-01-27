package batch

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

type ProcessOptions struct {
	MinWorkers           int
	MaxWorkers           int
	TargetQueuePerWorker int
	TimeoutPerItem       time.Duration
	Retries              int
	BaseBackoff          time.Duration
	MaxBackoff           time.Duration
	EnableCache          bool
	CacheTTL             time.Duration
	EnableCoalesce       bool
	EnableCircuitBreaker bool
	CircuitBuckets       int
	CircuitThreshold     int
	CircuitCoolDown      time.Duration
	GlobalRateLimit      int
	PostProcess          bool
}

type ProcessHooks struct {
	OnStart func(total int)
	OnDone  func()
	OnItem  func(id int, attempt int, err error)
}

func ProcessParallelOptimized(
	ctx context.Context,
	ids []int,
	dl Downloader,
	opts ProcessOptions,
	hooks *ProcessHooks,
) ([]string, []error) {
	if dl == nil {
		dl = DefaultDownloader{}
	}
	opts = withDefaults(opts)

	if hooks != nil && hooks.OnStart != nil {
		hooks.OnStart(len(ids))
	}
	defer func() {
		if hooks != nil && hooks.OnDone != nil {
			hooks.OnDone()
		}
	}()

	results := make([]string, len(ids))
	errs := make([]error, len(ids))

	rootCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	var cache *ttlCache
	if opts.EnableCache {
		cache = newTTLCache(dl.Clock(), opts.CacheTTL)
	}

	var co *coalescer
	if opts.EnableCoalesce {
		co = newCoalescer()
	}

	var cb *circuit
	if opts.EnableCircuitBreaker {
		cb = newCircuit(dl.Clock(), opts.CircuitBuckets, opts.CircuitThreshold, opts.CircuitCoolDown)
	}

	rl := newLimiter(opts.GlobalRateLimit)

	type job struct {
		idx int
		id  int
	}

	jobs := make(chan job)
	var wg sync.WaitGroup

	var inflight int64
	var doneCount int64

	postIn := make(chan struct {
		idx int
		val string
		err error
	}, opts.MaxWorkers*2)

	postOut := postIn
	if opts.PostProcess {
		out := make(chan struct {
			idx int
			val string
			err error
		}, opts.MaxWorkers*2)
		postOut = out
		wg.Add(1)
		go func() {
			defer wg.Done()
			for x := range postIn {
				if x.err != nil {
					out <- x
					continue
				}
				sum := sha256.Sum256([]byte(x.val))
				x.val = x.val + ":" + hex.EncodeToString(sum[:])
				out <- x
			}
			close(out)
		}()
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		for x := range postOut {
			if x.err != nil {
				errs[x.idx] = x.err
			} else {
				results[x.idx] = x.val
				errs[x.idx] = nil
			}
			if atomic.AddInt64(&doneCount, 1) == int64(len(ids)) {
				cancel()
			}
		}
	}()

	desired := int32(opts.MinWorkers)
	var active int32

	spawn := func(n int) {
		for i := 0; i < n; i++ {
			if int(atomic.LoadInt32(&active)) >= opts.MaxWorkers {
				return
			}
			atomic.AddInt32(&active, 1)
			wg.Add(1)
			go func() {
				defer wg.Done()
				defer atomic.AddInt32(&active, -1)

				for {
					select {
					case <-rootCtx.Done():
						return
					case j, ok := <-jobs:
						if !ok {
							return
						}

						atomic.AddInt64(&inflight, 1)
						val, err := processOne(rootCtx, j.id, dl, opts, cache, co, cb, rl, hooks)
						atomic.AddInt64(&inflight, -1)

						select {
						case <-rootCtx.Done():
							return
						case postIn <- struct {
							idx int
							val string
							err error
						}{idx: j.idx, val: val, err: err}:
						}
					}
				}
			}()
		}
	}

	spawn(opts.MinWorkers)

	wg.Add(1)
	go func() {
		defer wg.Done()
		t := dl.Clock()
		for {
			if rootCtx.Err() != nil {
				return
			}
			_ = t.Sleep(rootCtx, 15*time.Millisecond)
			if rootCtx.Err() != nil {
				return
			}

			a := int(atomic.LoadInt32(&active))
			if a <= 0 {
				continue
			}
			in := int(atomic.LoadInt64(&inflight))
			if in < 0 {
				in = 0
			}

			queueHint := len(jobs)
			target := a
			if opts.TargetQueuePerWorker > 0 {
				target = int(math.Ceil(float64(queueHint+in) / float64(maxInt(1, opts.TargetQueuePerWorker))))
			}
			if target < opts.MinWorkers {
				target = opts.MinWorkers
			}
			if target > opts.MaxWorkers {
				target = opts.MaxWorkers
			}

			cur := int(atomic.LoadInt32(&desired))
			if target != cur {
				atomic.StoreInt32(&desired, int32(target))
			}

			need := target - a
			if need > 0 {
				spawn(need)
			}
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		defer close(jobs)

		for i, id := range ids {
			select {
			case <-rootCtx.Done():
				return
			default:
			}

			for {
				a := int(atomic.LoadInt32(&active))
				d := int(atomic.LoadInt32(&desired))
				if a <= d {
					break
				}
				_ = dl.Clock().Sleep(rootCtx, 5*time.Millisecond)
				if rootCtx.Err() != nil {
					return
				}
			}

			select {
			case <-rootCtx.Done():
				return
			case jobs <- job{idx: i, id: id}:
			}
		}
	}()

	<-rootCtx.Done()
	close(postIn)
	wg.Wait()
	return results, errs
}

type Downloader interface {
	Download(ctx context.Context, id int) (string, error)
	Clock() Clock
	Rand() Rand
}

type DefaultDownloader struct{}

func (DefaultDownloader) Download(ctx context.Context, id int) (string, error) {
	t := time.NewTimer(100 * time.Millisecond)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	case <-t.C:
		return fmt.Sprintf("content_%d", id), nil
	}
}

func (DefaultDownloader) Clock() Clock { return RealClock{} }
func (DefaultDownloader) Rand() Rand {
	return lockedRand{r: rand.New(rand.NewSource(time.Now().UnixNano()))}
}

type Clock interface {
	Now() time.Time
	Sleep(ctx context.Context, d time.Duration) error
}

type RealClock struct{}

func (RealClock) Now() time.Time { return time.Now() }
func (RealClock) Sleep(ctx context.Context, d time.Duration) error {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}

type Rand interface {
	Int63n(n int64) int64
}

type lockedRand struct {
	mu sync.Mutex
	r  *rand.Rand
}

func (lr lockedRand) Int63n(n int64) int64 {
	lr.mu.Lock()
	defer lr.mu.Unlock()
	return lr.r.Int63n(n)
}

var (
	ErrRetryExhausted = errors.New("retry exhausted")
	ErrCircuitOpen    = errors.New("circuit open")
	ErrRateLimited    = errors.New("rate limited")
	ErrInvalidLimiter = errors.New("invalid limiter")
)

func withDefaults(opts ProcessOptions) ProcessOptions {
	if opts.MinWorkers <= 0 {
		opts.MinWorkers = clamp(runtime.GOMAXPROCS(0), 2, 32)
	}
	if opts.MaxWorkers <= 0 {
		opts.MaxWorkers = clamp(runtime.GOMAXPROCS(0)*6, opts.MinWorkers, 128)
	}
	if opts.MaxWorkers < opts.MinWorkers {
		opts.MaxWorkers = opts.MinWorkers
	}
	if opts.TargetQueuePerWorker <= 0 {
		opts.TargetQueuePerWorker = 4
	}
	if opts.TimeoutPerItem <= 0 {
		opts.TimeoutPerItem = 2 * time.Second
	}
	if opts.Retries < 0 {
		opts.Retries = 0
	}
	if opts.BaseBackoff <= 0 {
		opts.BaseBackoff = 25 * time.Millisecond
	}
	if opts.MaxBackoff <= 0 {
		opts.MaxBackoff = 400 * time.Millisecond
	}
	if opts.CacheTTL <= 0 {
		opts.CacheTTL = 2 * time.Second
	}
	if opts.CircuitBuckets <= 0 {
		opts.CircuitBuckets = 8
	}
	if opts.CircuitThreshold <= 0 {
		opts.CircuitThreshold = 3
	}
	if opts.CircuitCoolDown <= 0 {
		opts.CircuitCoolDown = 250 * time.Millisecond
	}
	if opts.GlobalRateLimit < 0 {
		opts.GlobalRateLimit = 0
	}
	return opts
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func processOne(
	ctx context.Context,
	id int,
	dl Downloader,
	opts ProcessOptions,
	cache *ttlCache,
	co *coalescer,
	cb *circuit,
	rl *limiter,
	hooks *ProcessHooks,
) (string, error) {
	if cache != nil {
		if v, ok := cache.get(id); ok {
			return v, nil
		}
	}

	if cb != nil {
		if !cb.allow(id) {
			return "", fmt.Errorf("%w: id=%d", ErrCircuitOpen, id)
		}
	}

	if rl != nil && rl.limit > 0 {
		if !rl.tryAcquire() {
			return "", fmt.Errorf("%w: id=%d", ErrRateLimited, id)
		}
		defer rl.release()
	} else if rl != nil && rl.limit < 0 {
		return "", ErrInvalidLimiter
	}

	run := func() (string, error) {
		return downloadWithPolicy(ctx, dl, id, opts, hooks)
	}

	if co != nil {
		return co.do(id, run)
	}

	val, err := run()
	if err == nil && cache != nil {
		cache.set(id, val)
	}
	if cb != nil {
		cb.observe(id, err)
	}
	return val, err
}

func downloadWithPolicy(ctx context.Context, dl Downloader, id int, opts ProcessOptions, hooks *ProcessHooks) (string, error) {
	itemCtx, cancel := context.WithTimeout(ctx, opts.TimeoutPerItem)
	defer cancel()

	var lastErr error
	for attempt := 0; attempt <= opts.Retries; attempt++ {
		val, err := dl.Download(itemCtx, id)
		if hooks != nil && hooks.OnItem != nil {
			hooks.OnItem(id, attempt, err)
		}
		if err == nil {
			return val, nil
		}
		lastErr = err
		if itemCtx.Err() != nil {
			return "", itemCtx.Err()
		}
		if attempt < opts.Retries {
			wait := backoffWithJitter(dl, opts, attempt)
			if err := dl.Clock().Sleep(itemCtx, wait); err != nil {
				return "", err
			}
		}
	}
	return "", fmt.Errorf("%w: id=%d last=%v", ErrRetryExhausted, id, lastErr)
}

func backoffWithJitter(dl Downloader, opts ProcessOptions, attempt int) time.Duration {
	backoff := opts.BaseBackoff << attempt
	if backoff > opts.MaxBackoff {
		backoff = opts.MaxBackoff
	}
	j := time.Duration(dl.Rand().Int63n(int64(maxDur(1, backoff/3))))
	return backoff + j
}

func maxDur(a, b time.Duration) time.Duration {
	if a > b {
		return a
	}
	return b
}

type ttlCache struct {
	mu    sync.RWMutex
	clk   Clock
	ttl   time.Duration
	store map[int]cacheEntry
}

type cacheEntry struct {
	val string
	exp time.Time
}

func newTTLCache(clk Clock, ttl time.Duration) *ttlCache {
	return &ttlCache{
		clk:   clk,
		ttl:   ttl,
		store: make(map[int]cacheEntry),
	}
}

func (c *ttlCache) get(id int) (string, bool) {
	now := c.clk.Now()
	c.mu.RLock()
	e, ok := c.store[id]
	c.mu.RUnlock()
	if !ok {
		return "", false
	}
	if !e.exp.IsZero() && now.After(e.exp) {
		c.mu.Lock()
		delete(c.store, id)
		c.mu.Unlock()
		return "", false
	}
	return e.val, true
}

func (c *ttlCache) set(id int, v string) {
	now := c.clk.Now()
	c.mu.Lock()
	c.store[id] = cacheEntry{val: v, exp: now.Add(c.ttl)}
	c.mu.Unlock()
}

type coalescer struct {
	mu sync.Mutex
	m  map[int]*call
}

type call struct {
	wg  sync.WaitGroup
	val string
	err error
}

func newCoalescer() *coalescer {
	return &coalescer{m: make(map[int]*call)}
}

func (c *coalescer) do(id int, fn func() (string, error)) (string, error) {
	c.mu.Lock()
	if existing, ok := c.m[id]; ok {
		c.mu.Unlock()
		existing.wg.Wait()
		return existing.val, existing.err
	}
	cl := &call{}
	cl.wg.Add(1)
	c.m[id] = cl
	c.mu.Unlock()

	cl.val, cl.err = fn()
	cl.wg.Done()

	c.mu.Lock()
	delete(c.m, id)
	c.mu.Unlock()

	return cl.val, cl.err
}

type circuit struct {
	clk       Clock
	buckets   int
	threshold int
	coolDown  time.Duration

	mu     sync.Mutex
	fail   []int
	openTo []time.Time
}

func newCircuit(clk Clock, buckets, threshold int, coolDown time.Duration) *circuit {
	return &circuit{
		clk:       clk,
		buckets:   maxInt(1, buckets),
		threshold: maxInt(1, threshold),
		coolDown:  coolDown,
		fail:      make([]int, maxInt(1, buckets)),
		openTo:    make([]time.Time, maxInt(1, buckets)),
	}
}

func (c *circuit) bucket(id int) int {
	if c.buckets <= 1 {
		return 0
	}
	x := id % c.buckets
	if x < 0 {
		x = -x
	}
	return x
}

func (c *circuit) allow(id int) bool {
	b := c.bucket(id)
	now := c.clk.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.openTo[b].IsZero() && now.Before(c.openTo[b]) {
		return false
	}
	return true
}

func (c *circuit) observe(id int, err error) {
	b := c.bucket(id)
	now := c.clk.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	if err == nil {
		if c.fail[b] > 0 {
			c.fail[b] = int(math.Floor(float64(c.fail[b]) * 0.5))
		}
		return
	}
	c.fail[b]++
	if c.fail[b] >= c.threshold {
		c.openTo[b] = now.Add(c.coolDown)
		c.fail[b] = 0
	}
}

type limiter struct {
	limit int
	inUse int32
}

func newLimiter(limit int) *limiter {
	return &limiter{limit: limit}
}

func (l *limiter) tryAcquire() bool {
	for {
		cur := atomic.LoadInt32(&l.inUse)
		if int(cur) >= l.limit {
			return false
		}
		if atomic.CompareAndSwapInt32(&l.inUse, cur, cur+1) {
			return true
		}
	}
}

func (l *limiter) release() {
	atomic.AddInt32(&l.inUse, -1)
}
