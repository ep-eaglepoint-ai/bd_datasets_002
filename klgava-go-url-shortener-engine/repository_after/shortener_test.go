package main

import (
	"fmt"
	"sync"
	"testing"
)

// TestValidation verifies rejection of invalid URLs.
func TestValidation(t *testing.T) {
	tests := []struct {
		input string
		want  string // expected key or "" for error
	}{
		{"http://google.com", "valid"},
		{"https://example.com/path?q=1", "valid"},
		{"ftp://ftp.example.com", "valid"},
		{"google.com", ""},       // No scheme
		{"/relative/path", ""},   // Relative
		{"", ""},                 // Empty
		{"http://", ""},          // Empty host? url.Parse might allow, but Scheme+Host check handles it.
	}

	for _, tt := range tests {
		u := tt.input
		key := Shorten(u)
		if tt.want == "valid" {
			if key == "" || len(key) != 7 {
				t.Errorf("Shorten(%q) failed, got %q", u, key)
			}
		} else {
			if key != "" {
				t.Errorf("Shorten(%q) should fail, got %q", u, key)
			}
		}
	}
}

// TestCollisionIntegrity simulates a collision to verify the resolution strategy.
func TestCollisionIntegrity(t *testing.T) {
	// 1. Pick a target URL
	urlA := "https://collision.test.com/A"
	
	// 2. Pre-calculate what its key WOULD be with salt 0
	keyA0 := generateKey(urlA, 0)
	
	// 3. Artificially occupy that slot with a DIFFERENT URL
	urlB := "https://collision.test.com/B"
	service.mu.Lock()
	service.store[keyA0] = urlB
	service.mu.Unlock()
	
	// 4. Try to shorten urlA. It should collide with keyA0 (occupied by B).
	// It should retry with salt=1 (or more) and find a new key.
	// Since we haven't occupied keyA1, it should succeed quickly.
	realKeyA := Shorten(urlA)
	
	if realKeyA == keyA0 {
		t.Fatal("Collision resolution failed: overwrote existing key or ignored collision")
	}
	if len(realKeyA) != 7 {
		t.Fatal("Invalid key length")
	}
	
	// 5. Verify integrity
	// keyA0 should still resolve to B
	if got := Resolve(keyA0); got != urlB {
		t.Errorf("Original key corrupted: %v => %v, want %v", keyA0, got, urlB)
	}
	// realKeyA should resolve to A
	if got := Resolve(realKeyA); got != urlA {
		t.Errorf("New key failed resolve: %v => %v, want %v", realKeyA, got, urlA)
	}
	
	// 6. Verify Idempotence: Shortening A again should return realKeyA
	retryKey := Shorten(urlA)
	if retryKey != realKeyA {
		t.Errorf("Idempotency failed: got %v, want %v", retryKey, realKeyA)
	}
}

// TestConcurrency performs strict stress testing with 10,000 goroutines.
// Run with `go test -race` to prove thread safety.
func TestConcurrency(t *testing.T) {
	// Reset store for clean test?
	// Not strictly necessary if relying on map size, but cleaner.
	// We can't easily replace the global singleton safely while others run,
	// but in a test function we are sequential wrt other tests (mostly).
	// service = &URLShortener{store: make(map[string]string)} 
	// Make a new instance for this test purely
	testService := &URLShortener{store: make(map[string]string)}
	// Swap global strictly for this test? Risky if parallel.
	// Better: Use the global one.
	
	const n = 10000
	var wg sync.WaitGroup
	wg.Add(n)
	
	// Errors channel to collect failures
	errCh := make(chan error, n)
	
	for i := 0; i < n; i++ {
		go func(id int) {
			defer wg.Done()
			u := fmt.Sprintf("https://stress-test.com/%d", id)
			
			// Shorten
			key := Shorten(u)
			if key == "" {
				errCh <- fmt.Errorf("Shorten failed for %d", id)
				return
			}
			
			// Resolve
			got := Resolve(key)
			if got != u {
				errCh <- fmt.Errorf("Resolve mismatch: want %s, got %s", u, got)
				return
			}
		}(i)
	}
	
	wg.Wait()
	close(errCh)
	
	for err := range errCh {
		t.Error(err)
	}
	
	// Verify total count implies no overwrites (assuming all unique inputs)
	// We mixed into global store which might have other test data.
	// But we added N unique URLs. The count should increase by at least N.
	// Since we can't track previous count easily without race, we just trust the individual Verify steps in the loop.
	// (Each goroutine verified its OWN write).
}
