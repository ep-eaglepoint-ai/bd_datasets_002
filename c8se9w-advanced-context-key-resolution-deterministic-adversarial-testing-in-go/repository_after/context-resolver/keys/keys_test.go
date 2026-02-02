package keys

import (
	"fmt"
	"math/rand"
	"sync"
	"testing"
	"time"
)

// Test helpers

type mockClock struct {
	mu  sync.Mutex
	now time.Time
}

func newMockClock() *mockClock {
	return &mockClock{now: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)}
}

func (m *mockClock) Now() time.Time {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.now
}

func (m *mockClock) Set(t time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.now = t
}

func (m *mockClock) Add(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.now = m.now.Add(d)
}

type metricCall struct {
	Name      string
	Value     float64
	Timestamp time.Time
	Type      string // "inc" or "observe"
}

type mockMetrics struct {
	mu    sync.Mutex
	calls []metricCall
	clock Clock
}

func newMockMetrics(clk Clock) *mockMetrics {
	return &mockMetrics{
		clock: clk,
	}
}

func (m *mockMetrics) Inc(name string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Time{}
	if m.clock != nil {
		now = m.clock.Now()
	}
	m.calls = append(m.calls, metricCall{Name: name, Value: 1, Timestamp: now, Type: "inc"})
}

func (m *mockMetrics) Observe(name string, v float64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Time{}
	if m.clock != nil {
		now = m.clock.Now()
	}
	m.calls = append(m.calls, metricCall{Name: name, Value: v, Timestamp: now, Type: "observe"})
}

// GetCalls returns a copy of calls for thread-safe assertions
func (m *mockMetrics) GetCalls() []metricCall {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]metricCall(nil), m.calls...)
}

func (m *mockMetrics) Count(name string, typ string) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	count := 0
	for _, c := range m.calls {
		if c.Name == name && c.Type == typ {
			count++
		}
	}
	return count
}

// Test NormalizeContext (Requirements 1 & 5)
func TestNormalizeContext_Adversarial(t *testing.T) {
	n := Normalizer{
		RegionAliases: map[string]string{
			"usa": "us",
			"uk":  "gb",
			"foo": "bar", // chained: bar -> baz (below)
			"bar": "baz",
		},
		FillUnknown: true,
	}

	tests := []struct {
		name       string
		input      Context
		want       Context
		wantErr    bool
		wantErrTyp error
	}{
		{
			name: "mixed whitespace and case",
			input: Context{
				Region:   "  US  ",
				Language: "En",
				Device:   "\tMobile\n",
				Browser:  "Chrome",
				OS:       "WINDOWS",
				Version:  " 1.0 ",
			},
			want: Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0"},
		},
		{
			name: "alias resolution simple",
			input: Context{
				Region:  "USA",
				Version: "1.0",
			},
			want: Context{Region: "us", Language: "unknown", Device: "unknown", Browser: "unknown", OS: "unknown", Version: "1.0"},
		},
		// Note: The current implementation only does one pass of alias resolution.
		{
			name: "alias resolution non-recursive",
			input: Context{
				Region:  "foo",
				Version: "1.0",
			},
			want: Context{Region: "bar", Language: "unknown", Device: "unknown", Browser: "unknown", OS: "unknown", Version: "1.0"},
		},
		{
			name: "fill unknown",
			input: Context{
				Region:  "us",
				Version: "", // Should become unknown
			},
			want: Context{Region: "us", Language: "unknown", Device: "unknown", Browser: "unknown", OS: "unknown", Version: "unknown"},
		},
		{
			name: "invalid segment characters",
			input: Context{
				Region:  "us@",
				Version: "1.0",
			},
			wantErr:    true,
			wantErrTyp: ErrInvalidSegment,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := n.NormalizeContext(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Errorf("NormalizeContext() expected error, got nil")
				} else if tt.wantErrTyp != nil && err != tt.wantErrTyp {
					t.Errorf("NormalizeContext() error = %v, want %v", err, tt.wantErrTyp)
				}
				return
			}
			if err != nil {
				t.Errorf("NormalizeContext() unexpected error: %v", err)
				return
			}
			if got != tt.want {
				t.Errorf("NormalizeContext() = %+v, want %+v", got, tt.want)
			}
		})
	}
}

// Test ParseContextKey (Requirements 2 & 6)
func TestParseContextKey_Adversarial(t *testing.T) {
	tests := []struct {
		name           string
		key            string
		allowWildcards bool
		want           Context
		wantErr        bool
		wantErrTyp     error
	}{
		{
			name:           "valid key basic",
			key:            "us-en-mobile-chrome-windows-1.0",
			allowWildcards: false,
			want:           Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0"},
		},
		{
			name:           "valid key wildcards allowed",
			key:            "*-en-*-chrome-*-1.0",
			allowWildcards: true,
			want:           Context{Region: "*", Language: "en", Device: "*", Browser: "chrome", OS: "*", Version: "1.0"},
		},
		{
			name:           "wildcards not allowed",
			key:            "*-en-*-chrome-*-1.0",
			allowWildcards: false,
			wantErr:        true,
			wantErrTyp:     ErrInvalidSegment,
		},
		{
			name:           "consecutive hyphens (empty segment)",
			key:            "us--mobile-chrome-windows-1.0",
			allowWildcards: true,
			wantErr:        true,
			wantErrTyp:     ErrInvalidSegment,
		},
		{
			name:           "leading hyphen",
			key:            "-us-en-mobile-chrome-windows-1.0",
			allowWildcards: true,
			wantErr:        true,
			wantErrTyp:     ErrInvalidKeyFormat,
		},
		{
			name:           "trailing hyphen",
			key:            "us-en-mobile-chrome-windows-1.0-",
			allowWildcards: true,
			wantErr:        true,
			wantErrTyp:     ErrInvalidKeyFormat,
		},
		{
			name:           "unicode characters rejected",
			key:            "us-en-møbile-chrome-windows-1.0",
			allowWildcards: true,
			wantErr:        true,
			wantErrTyp:     ErrInvalidSegment,
		},
		{
			name:           "too few segments",
			key:            "us-en-mobile",
			allowWildcards: true,
			wantErr:        true,
			wantErrTyp:     ErrInvalidKeyFormat,
		},
		{
			name:           "too many segments",
			key:            "us-en-mobile-chrome-windows-1.0-extra",
			allowWildcards: true,
			wantErr:        true,
			wantErrTyp:     ErrInvalidKeyFormat,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseContextKey(tt.key, tt.allowWildcards)
			if tt.wantErr {
				if err == nil {
					t.Errorf("ParseContextKey() expected error, got nil")
				} else if tt.wantErrTyp != nil && err != tt.wantErrTyp {
					// Check if error matches expected type (scan error message or direct comparison)
					// Standard Go errors comparison
					if err != tt.wantErrTyp {
						t.Errorf("ParseContextKey() error = %v, want %v", err, tt.wantErrTyp)
					}
				}
				return
			}
			if err != nil {
				t.Errorf("ParseContextKey() unexpected error: %v", err)
				return
			}
			if got != tt.want {
				t.Errorf("ParseContextKey() = %+v, want %+v", got, tt.want)
			}
		})
	}
}

// Test CompareVersions (Requirement 3 & 7)
func TestCompareVersions_Adversarial(t *testing.T) {
	tests := []struct {
		name string
		a    string
		b    string
		want int
	}{
		{"numeric equal", "1.2", "1.2", 0},
		{"numeric less", "1.2", "1.10", -1}, // 2 < 10
		{"numeric greater", "1.10", "1.2", 1},
		{"prefix equal", "1.2", "1.2.0.0", 0}, // 1.2 == 1.2.0.0
		{"prefix less", "1.2", "1.2.1", -1},
		{"stringy numeric", "1.02", "1.2", 0}, // 02 == 2
		{"mixed numeric non-numeric", "1.2.alpha", "1.2.beta", -1}, // alpha < beta (hashing check below)
		// Note: Hashing behavior is verified by determinism test, strict ordering for specific strings depends on hash
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CompareVersions(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("CompareVersions(%q, %q) = %d, want %d", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestCompareVersions_DeterminismAndStability(t *testing.T) {
	// Non-numeric parts are hashed. We don't enforce specific hash values,
	// but we enforce strict stability and symmetry.
	cases := []struct {
		a, b string
	}{
		{"1.0.alpha", "1.0.beta"},
		{"1.0.rc1", "1.0.rc2"},
		{"1.0.prod", "1.0.stage"},
		{"v1", "v2"},
	}

	for _, tc := range cases {
		t.Run(tc.a+"_vs_"+tc.b, func(t *testing.T) {
			res1 := CompareVersions(tc.a, tc.b)
			res2 := CompareVersions(tc.b, tc.a)

			// 1. Stability: Repeated calls return same result
			for i := 0; i < 100; i++ {
				if r := CompareVersions(tc.a, tc.b); r != res1 {
					t.Fatalf("CompareVersions unstable for %q vs %q: got %d then %d", tc.a, tc.b, res1, r)
				}
			}

			// 2. Symmetry: a < b implies b > a (unless equal)
			if res1 == 0 {
				if res2 != 0 {
					t.Errorf("CompareVersions(%q,%q)=0 but reverse=%d", tc.a, tc.b, res2)
				}
			} else {
				if res1 != -res2 {
					t.Errorf("CompareVersions(%q,%q)=%d but reverse=%d (expected %d)", tc.a, tc.b, res1, res2, -res1)
				}
			}
		})
	}
}

// Test MatchScore (Requirement 4 & 8)
func TestMatchScore_Precise(t *testing.T) {
	tests := []struct {
		name    string
		pattern Pattern
		ctx     Context
		want    int
		wantOk  bool
	}{
		{
			name:    "exact match all segments",
			pattern: "us-en-mobile-chrome-windows-1.0",
			ctx:     Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0"},
			want:    60, // 6 * 10
			wantOk:  true,
		},
		{
			name:    "wildcards",
			pattern: "*-en-*-chrome-*-1.0",
			ctx:     Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0"},
			want:    33, // 1 + 10 + 1 + 10 + 1 + 10
			wantOk:  true,
		},
		{
			name:    "version prefix match x.y.* matches x.y",
			pattern: "us-en-mobile-chrome-windows-1.0.*",
			ctx:     Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0"},
			want:    56, // 5*10 + 6 (prefix match)
			wantOk:  true,
		},
		{
			name:    "version prefix match x.y.* matches x.y.z",
			pattern: "us-en-mobile-chrome-windows-1.0.*",
			ctx:     Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0.5"},
			want:    56, // 5*10 + 6
			wantOk:  true,
		},
		{
			name:    "version prefix mismatch x.y.* does not match x.yx",
			pattern: "us-en-mobile-chrome-windows-1.2.*",
			ctx:     Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.20.1"},
			want:    0,
			wantOk:  false,
		},
		{
			name:    "single segment mismatch",
			pattern: "us-en-mobile-chrome-windows-1.0",
			ctx:     Context{Region: "gb", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0"},
			want:    0,
			wantOk:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := MatchScore(tt.pattern, tt.ctx)
			if ok != tt.wantOk {
				t.Errorf("MatchScore() ok = %v, want %v", ok, tt.wantOk)
			}
			if ok && got != tt.want {
				t.Errorf("MatchScore() = %d, want %d", got, tt.want)
			}
		})
	}
}

// Test LRUCache (Requirement 5 & 9)
func TestLRUCache_Torture(t *testing.T) {
	// Seeded random for determinism
	rng := rand.New(rand.NewSource(42))
	capacity := 50
	cache := NewLRUCache(capacity)

	// Reference model: simplified slice implementation
	type entry struct {
		key string
		val string
	}
	model := []entry{}

	moveToFront := func(key string) {
		for i, e := range model {
			if e.key == key {
				// Move to end (front)
				val := e.val
				model = append(model[:i], model[i+1:]...)
				model = append(model, entry{key, val})
				return
			}
		}
	}

	put := func(key, val string) {
		// remove if exists
		for i, e := range model {
			if e.key == key {
				model = append(model[:i], model[i+1:]...)
				break
			}
		}
		model = append(model, entry{key, val})
		if len(model) > capacity {
			model = model[1:] // remove first (LRU)
		}
	}

	// Run 1000 random operations
	keysList := make([]string, 100)
	for i := range keysList {
		keysList[i] = fmt.Sprintf("k%d", i)
	}

	for i := 0; i < 1000; i++ {
		op := rng.Intn(2)
		k := keysList[rng.Intn(len(keysList))]

		if op == 0 { // Put
			v := fmt.Sprintf("v%d", i)
			cache.Put(k, Result{Value: v})
			put(k, v)
		} else { // Get
			res, ok := cache.Get(k)
			found := false
			var expected string
			for _, e := range model {
				if e.key == k {
					found = true
					expected = e.val
					break
				}
			}

			if ok != found {
				t.Fatalf("iter %d: Get(%s) ok=%v want=%v", i, k, ok, found)
			}
			if found && res.Value != expected {
				t.Fatalf("iter %d: Get(%s) val=%s want=%s", i, k, res.Value, expected)
			}
			if found {
				moveToFront(k)
			}
		}
	}

	// Final verification of content
	for _, e := range model {
		res, ok := cache.Get(e.key)
		if !ok || res.Value != e.val {
			t.Errorf("Final check: key %s missing or wrong value", e.key)
		}
	}
}

// Test Resolver (Requirement 10)
func TestResolver_DeterministicSort(t *testing.T) {

	
	// Create two patterns that will have IDENTICAL scores for a specific context
	// Pattern 1: us-en-*-*-*-* (score: region(10) + lang(10) + 4*1 = 24)
	// Pattern 2: us-*-mobile-*-*-* (score: region(10) + 1 + device(10) + 3*1 = 24)
	p1 := Pattern("us-en-*-*-*-1.0")
	p2 := Pattern("us-*-mobile-*-*-1.0")
	
	ctx := Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0"}

	// We shuffle insertion order
	rng := rand.New(rand.NewSource(123))
	
	// Add patterns in random order multiple times
	for i := 0; i < 20; i++ {
		r := NewResolver(ResolverOptions{CacheSize: 100})
		if rng.Intn(2) == 0 {
			r.Add(p1, "val1")
			r.Add(p2, "val2")
		} else {
			r.Add(p2, "val2")
			r.Add(p1, "val1")
		}

		res, err := r.Lookup(ctx)
		if err != nil {
			t.Fatalf("Lookup failed: %v", err)
		}

		// Sorted list is [p2, p1] because '*' (42) < 'e' (101).
		if res.Value != "val2" {
			t.Fatalf("iter %d: Expected deterministic win by lexicographical sort. Got %s (from %s), want val2 (from %s)", 
				i, res.Value, res.MatchedKey, p2)
		}
	}
}

func TestResolver_ConcurrencyAndRace(t *testing.T) {
	// 50 goroutines reading, 10 writing, overlapping keys.
	// Barriers to ensure simultaneous start.
	


	clk := newMockClock()
	metrics := newMockMetrics(clk)
	r := NewResolver(ResolverOptions{
		Clock: clk, 
		Metrics: metrics,
		CacheSize: 1000,
	})

	// Pre-fill
	r.Add("us-en-mobile-chrome-windows-1.0", "initial")

	var wg sync.WaitGroup
	start := make(chan struct{})
	
	readers := 50
	writers := 10
	ops := 100

	// Readers
	for i := 0; i < readers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			ctx := Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0"}
			for k := 0; k < ops; k++ {
				res, err := r.Lookup(ctx)
				if err != nil && err != ErrNoMatch {
					t.Errorf("Lookup error: %v", err)
				}
				if err == nil && res.Value != "initial" && res.Value != "updated" {
					t.Errorf("Got unexpected value: %s", res.Value)
				}
			}
		}()
	}

	// Writers
	for i := 0; i < writers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			for k := 0; k < ops; k++ {
				// Toggle add/remove or update
				if k%2 == 0 {
					r.Add("us-en-mobile-chrome-windows-1.0", "updated")
				} else {
					r.Add("us-en-mobile-chrome-windows-1.0", "initial")
				}
			}
		}()
	}

	close(start)
	wg.Wait()

	// Check standard metrics exist
	if metrics.Count("add", "inc") == 0 {
		t.Error("Expected add metrics")
	}
}

func TestResolver_ObservabilityOrder(t *testing.T) {
	clk := newMockClock()
	metrics := newMockMetrics(clk)
	r := NewResolver(ResolverOptions{Clock: clk, Metrics: metrics, CacheSize: 10})

	r.Add("us-en-mobile-chrome-windows-1.0", "val")
	
	ctx := Context{Region: "us", Language: "en", Device: "mobile", Browser: "chrome", OS: "windows", Version: "1.0"}
	
	// 1. First Lookup: Miss -> Compute -> Store -> Observe Latency
	// Note: MockClock doesn't auto-advance so latency will be 0.
	
	r.Lookup(ctx)
	
	calls := metrics.GetCalls()
	foundLatency := false
	for _, c := range calls {
		if c.Name == "latency_ms" {
			foundLatency = true
			if c.Timestamp.IsZero() {
				t.Error("Metric timestamp should be set")
			}
		}
	}
	if !foundLatency {
		t.Error("Expected latency_ms observation on first lookup")
	}
	
	// 2. Second Lookup: Hit -> No Latency Observation
	callsBefore := len(metrics.GetCalls())
	r.Lookup(ctx)
	callsAfter := len(metrics.GetCalls())
	
	if callsAfter != callsBefore {
		t.Errorf("Expected no new metrics on cache hit, got %d new calls", callsAfter-callsBefore)
	}
}
