package main

import (
	"fmt"
	"sync"
	"testing"
    "time"
)

// Requirement 4: Input Integrity - Enforce strict validation
// Requirement 8: Validation Coverage - Positive and negative test cases
func TestValidationRequirements(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		shouldPass bool
	}{
		{"Valid HTTPS", "https://google.com", true},
		{"Valid HTTPS with Path", "https://example.com/path/to/resource", true},
		{"Valid HTTP", "http://example.org", true},
		{"Valid with Query", "https://api.test/v1?q=golang", true},
		{"Valid with Fragment", "https://docs.go.dev#check", true},
		
		{"Invalid: No Scheme", "google.com", false},
		{"Invalid: Relative Path", "/api/v1", false},
		{"Invalid: Empty", "", false},
		{"Invalid: FTP Scheme (Strict)", "ftp://example.com", false}, // Assuming we only want http/https, or maybe strictly "absolute URL". The implementation uses url.ParseRequestURI which allows others, but checking Host is crucial.
        // My implementation checks u.Scheme != "" && u.Host != "". ftp://example.com has scheme=ftp, host=example.com.
        // Requirement says "strict validation... well-formed absolute URLs". url.ParseRequestURI handles this.
	}

    // Checking if we are running against "before" or "after" logic implicitly by result.
    // However, existing "before" logic returns a hash for EVERYTHING.
    // We expect the "after" logic to return EMPTY STRING for invalid.

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := Shorten(tt.input)
			if tt.shouldPass {
				if key == "" {
                    // Check if it's the "before" repo which returns a string but maybe not validated?
                    // Actually, if "before" code works, it returns a key.
                    // If "after" code works, it returns a key.
					t.Errorf("Expected success for %q, got empty string", tt.input)
				}
                // Requirement 3: Encoding Optimization (7 chars)
                if len(key) != 7 && len(key) != 0 {
                    // This might trigger on "before" repo (len 6).
                    t.Logf("Warning: Key length is %d (expected 7 for optimized encoding)", len(key))
                }
			} else {
				if key != "" && len(key) > 0 {
                    // If we are testing "before" repo, this WILL fail because it doesn't validate.
                    // This asserts Requirement 4.
					t.Errorf("Expected validation failure for %q, got key %q", tt.input, key)
				}
			}
		})
	}
}

// Requirement 3: Encoding Optimization - 7-char Base62
func TestEncodingRequirements(t *testing.T) {
	url := "https://encoding.test.com"
	key := Shorten(url)
	
	if key == "" {
		t.Skip("Skipping encoding test due to validation failure/empty key")
	}

	if len(key) != 7 {
		t.Errorf("Requirement Failed: Key length must be exactly 7. Got %d (%q)", len(key), key)
	}

	// Check Alphanumeric
	for _, r := range key {
		isAlpha := (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')
		if !isAlpha {
			t.Errorf("Requirement Failed: Key must be Alphanumeric. Invalid char: %c in %q", r, key)
		}
	}
}

// Requirement 1 & 6: Thread Safety & Concurrency Validation
// Support 10,000 concurrent R/W operations.
func TestConcurrencyStress(t *testing.T) {
	// 10,000 goroutines
	const concurrency = 10000
    
	var wg sync.WaitGroup
	wg.Add(concurrency)

    // Capture errors
    errCh := make(chan error, concurrency)

    start := time.Now()

	for i := 0; i < concurrency; i++ {
		go func(id int) {
			defer wg.Done()
            // Unique URL to force writes
			u := fmt.Sprintf("https://stress.test/resource/%d", id)
			
			// Write
			key := Shorten(u)
			if key == "" {
				errCh <- fmt.Errorf("Shorten failed for id %d", id)
				return
			}

			// Read back
			resolved := Resolve(key)
			if resolved != u {
				errCh <- fmt.Errorf("Data Corruption! Key %s resolved to %s, want %s", key, resolved, u)
			}
		}(i)
	}

	wg.Wait()
    close(errCh)
    duration := time.Since(start)

    t.Logf("Processed %d requests in %v", concurrency, duration)

    for err := range errCh {
        // Fail on first error to avoid spam
        t.Fatal(err)
    }
}

// Requirement 5: Performance O(1)
// We rely on standard Go Benchmark for this.
func BenchmarkShorten(b *testing.B) {
    // Pre-generate URL to avoid fmt overhead in loop
    u := "https://benchmark.test.com/resource"
    b.ResetTimer()
	for i := 0; i < b.N; i++ {
		Shorten(u)
	}
}

func BenchmarkResolve(b *testing.B) {
    u := "https://benchmark.test.com/resolve"
    k := Shorten(u)
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        Resolve(k)
    }
}

// TestCollisionIntegrityRequirement simulates a collision to verify the resolution strategy.
func TestCollisionIntegrityRequirement(t *testing.T) {
    // This part of the test assumes knowledge of the internal 'GenerateKey' function 
    // or 'Service' struct. If this file is compiled with code that lacks these, 
    // it will fail build on "before" repo.
    
    urlA := "https://collision.test.com/A"
	keyA0 := GenerateKey(urlA, 0)
    
	urlB := "https://collision.test.com/B"
	Service.mu.Lock()
	Service.Store[keyA0] = urlB
	Service.mu.Unlock()
	
	realKeyA := Shorten(urlA)
	
	if realKeyA == keyA0 {
		t.Fatal("Collision resolution failed: overwrote existing key or ignored collision")
	}
	
	if got := Resolve(keyA0); got != urlB {
		t.Errorf("Original key corrupted: %v => %v, want %v", keyA0, got, urlB)
	}
    
	if got := Resolve(realKeyA); got != urlA {
		t.Errorf("New key failed resolve: %v => %v, want %v", realKeyA, got, urlA)
	}
}
