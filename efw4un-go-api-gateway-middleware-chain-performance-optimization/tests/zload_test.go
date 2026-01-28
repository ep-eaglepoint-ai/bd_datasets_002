package main_test

import (
	"apigateway/gateway"
	"io"
	"net/http"
	"net/http/httptest"
	"sort"
	"sync"
	"testing"
	"time"
)

func TestZLoad_Sustained(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping load test in short mode")
	}

	// Mock Backend
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate some processing time
		time.Sleep(10 * time.Millisecond)
		w.WriteHeader(200)
		w.Write([]byte("OK"))
	}))
	defer backend.Close()

	// Setup Gateway Chain
	client := gateway.NewHTTPClient()
	rateLimiter := gateway.NewRateLimiter(5000, 5000) // High limit for load test
	handler := gateway.NewProxyHandler(client, backend.URL)
	chain := gateway.LoggingMiddleware(gateway.AuthMiddleware(gateway.RateLimitMiddleware(rateLimiter)(handler)))

	server := httptest.NewServer(chain)
	defer server.Close()

	// Stress Test Parameters
	totalRequests := 2500 // 5 seconds at 500 RPS
	concurrency := 50
	successCount := 0
	var successMu sync.Mutex
	latencies := make([]time.Duration, 0, totalRequests)
	var latMu sync.Mutex

	var wg sync.WaitGroup
	requestsPerWorker := totalRequests / concurrency

	start := time.Now()

	clientLoad := &http.Client{
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 100,
		},
	}

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < requestsPerWorker; j++ {
				reqStart := time.Now()
				req, _ := http.NewRequest("GET", server.URL, nil)
				req.Header.Set("Authorization", "Bearer validtokenlength123")

				resp, err := clientLoad.Do(req)
				if err == nil {
					io.Copy(io.Discard, resp.Body)
					resp.Body.Close()

					dur := time.Since(reqStart)

					latMu.Lock()
					latencies = append(latencies, dur)
					latMu.Unlock()

					if resp.StatusCode == 200 {
						successMu.Lock()
						successCount++
						successMu.Unlock()
					}
				}
			}
		}()
	}

	wg.Wait()
	totalDuration := time.Since(start)

	// Stats
	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	if len(latencies) == 0 {
		t.Fatal("No requests completed")
	}
	p99Index := int(float64(len(latencies)) * 0.99)
	p99 := latencies[p99Index]

	rps := float64(totalRequests) / totalDuration.Seconds()

	t.Logf("RPS: %.2f", rps)
	t.Logf("P99 Latency: %v", p99)
	t.Logf("Success Rate: %d/%d", successCount, totalRequests)

	if p99 > 100*time.Millisecond {
		t.Errorf("P99 latency too high: %v (expected < 100ms)", p99)
	}
}
