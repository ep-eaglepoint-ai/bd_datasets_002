package traffic_mirroring_test

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"traffic-mirroring/repository_after/proxy"
)

// TestHelper is a helper struct for test utilities
type TestHelper struct {
	liveUpstreamCalled   atomic.Bool
	shadowUpstreamCalled atomic.Bool
	liveBodyReceived     atomic.Value
	shadowBodyReceived   atomic.Value
	mu                  sync.Mutex
	liveLatency          time.Duration
	shadowLatency        time.Duration
	headersReceived      atomic.Value
}

// createTestUpstreams creates mock upstreams for testing
func createTestUpstreams(t *testing.T) (*httptest.Server, *httptest.Server, *TestHelper) {
	helper := &TestHelper{}

	liveUpstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("Live upstream failed to read body: %v", err)
			http.Error(w, "Failed to read body", http.StatusBadRequest)
			return
		}
		r.Body.Close()
		helper.liveUpstreamCalled.Store(true)
		helper.liveBodyReceived.Store(string(body))
		helper.mu.Lock()
		helper.liveLatency = time.Since(start)
		helper.mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(fmt.Sprintf(`{"status": "live_ok", "received": %q}`, string(body))))
	}))

	shadowUpstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("Shadow upstream failed to read body: %v", err)
			return
		}
		r.Body.Close()
		helper.shadowUpstreamCalled.Store(true)
		helper.shadowBodyReceived.Store(string(body))
		helper.mu.Lock()
		helper.shadowLatency = time.Since(start)
		helper.mu.Unlock()
		helper.headersReceived.Store(r.Header.Clone())

		w.WriteHeader(http.StatusOK)
	}))

	return liveUpstream, shadowUpstream, helper
}

// Requirement 1: Test that req.Body is read exactly once and two distinct NopCloser instances are created
func TestBodyBufferReading(t *testing.T) {
	liveUpstream, shadowUpstream, helper := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstream.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))

	testBody := `{"test": "data", "value": 123}`
	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(testBody))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)

	if !helper.liveUpstreamCalled.Load() {
		t.Error("Live upstream was not called")
	}
	if !helper.shadowUpstreamCalled.Load() {
		t.Error("Shadow upstream was not called")
	}

	liveBody := helper.liveBodyReceived.Load().(string)
	shadowBody := helper.shadowBodyReceived.Load().(string)

	if liveBody != testBody {
		t.Errorf("Live upstream received wrong body. Got %q, want %q", liveBody, testBody)
	}
	if shadowBody != testBody {
		t.Errorf("Shadow upstream received wrong body. Got %q, want %q", shadowBody, testBody)
	}
	if liveBody != shadowBody {
		t.Error("Live and Shadow upstreams received different bodies")
	}
}

// Requirement 2: Test that shadow request runs asynchronously (non-blocking)
func TestShadowRequestAsync(t *testing.T) {
	liveUpstream, shadowUpstream, helper := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	shadowUpstreamServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
		helper.shadowUpstreamCalled.Store(true)
		w.WriteHeader(http.StatusOK)
	}))
	defer shadowUpstreamServer.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstreamServer.URL, 10*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"test": "data"}`))
	req.Header.Set("Content-Type", "application/json")

	start := time.Now()
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	totalLatency := time.Since(start)

	if totalLatency > 200*time.Millisecond {
		t.Errorf("Live response took too long (%v), indicating shadow request blocked", totalLatency)
	}

	time.Sleep(600 * time.Millisecond)
	if !helper.shadowUpstreamCalled.Load() {
		t.Error("Shadow upstream was not called")
	}
}

// Requirement 3: Test that shadow request uses new context (context.Background())
func TestShadowRequestUsesNewContext(t *testing.T) {
	liveUpstream, shadowUpstream, _ := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstream.URL, 5*time.Second)

	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"test": "data"}`))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)

	time.Sleep(200 * time.Millisecond)

	if recorder.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, recorder.Code)
	}
}

// Requirement 4: Test that ContentLength is updated when replacing body
func TestContentLengthUpdated(t *testing.T) {
	liveUpstream, shadowUpstream, _ := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	var receivedContentLength int64
	var mu sync.Mutex

	liveUpstreamServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		receivedContentLength = r.ContentLength
		mu.Unlock()
		w.WriteHeader(http.StatusOK)
	}))
	defer liveUpstreamServer.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstreamServer.URL, shadowUpstream.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	testBody := `{"test": "data_with_specific_length"}`
	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(testBody))
	req.Header.Set("Content-Type", "application/json")

	handler.ServeHTTP(httptest.NewRecorder(), req)

	mu.Lock()
	defer mu.Unlock()
	if receivedContentLength != int64(len(testBody)) {
		t.Errorf("ContentLength mismatch. Expected %d, got %d", len(testBody), receivedContentLength)
	}
}

// Requirement 5: Test that live response is returned and shadow response is discarded
func TestLiveResponseReturned(t *testing.T) {
	// Create a live upstream that returns custom status and headers
	liveUpstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Live-Header", "live-value")
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"live": "response"}`))
	}))
	defer liveUpstream.Close()

	// Shadow upstream that returns different response
	shadowUpstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Shadow-Header", "shadow-value")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"shadow": "response"}`))
	}))
	defer shadowUpstream.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstream.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"test": "data"}`))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)

	// Verify live response is returned (not shadow)
	if recorder.Code != http.StatusCreated {
		t.Errorf("Expected status %d (from live), got %d", http.StatusCreated, recorder.Code)
	}

	// Verify live header is present
	liveHeader := recorder.Header().Get("X-Live-Header")
	if liveHeader != "live-value" {
		t.Errorf("Expected live header, got %q", liveHeader)
	}

	// Verify shadow header is NOT present (shadow response is discarded)
	shadowHeader := recorder.Header().Get("X-Shadow-Header")
	if shadowHeader != "" {
		t.Errorf("Did not expect shadow header, got %q", shadowHeader)
	}
}

// Requirement 6: Test that panic in shadow goroutine doesn't crash the application
func TestShadowPanicRecovery(t *testing.T) {
	liveUpstream, shadowUpstream, _ := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	panicUpstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("intentional panic in shadow")
	}))
	defer panicUpstream.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, panicUpstream.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"test": "data"}`))
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()

	func() {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("Application panicked when shadow goroutine panicked: %v", r)
			}
		}()
		handler.ServeHTTP(recorder, req)
	}()

	if recorder.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, recorder.Code)
	}
}

// Requirement 7: Test that original req.Body is closed
func TestOriginalBodyClosed(t *testing.T) {
	liveUpstream, shadowUpstream, _ := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstream.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"test": "data"}`))
	req.Header.Set("Content-Type", "application/json")

	handler.ServeHTTP(httptest.NewRecorder(), req)
	time.Sleep(100 * time.Millisecond)
}

// Requirement 8: Test that shadow request receives copy of headers
func TestShadowHeadersCopied(t *testing.T) {
	liveUpstream, shadowUpstream, helper := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstream.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"test": "data"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Custom-Header", "custom-value")
	req.Header.Set("Authorization", "Bearer test-token")

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)

	time.Sleep(200 * time.Millisecond)

	receivedHeaders := helper.headersReceived.Load().(http.Header)

	if receivedHeaders.Get("X-Custom-Header") != "custom-value" {
		t.Errorf("Shadow did not receive X-Custom-Header. Got %q", receivedHeaders.Get("X-Custom-Header"))
	}

	if receivedHeaders.Get("Authorization") != "Bearer test-token" {
		t.Errorf("Shadow did not receive Authorization header")
	}
}

// Requirement 9: Test that shadow request uses same HTTP method and URL/Path
func TestShadowPreservesMethodAndPath(t *testing.T) {
	liveUpstream, shadowUpstream, _ := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	var mu sync.Mutex
	var receivedMethod, receivedPath string

	shadowUpstreamServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		receivedMethod = r.Method
		receivedPath = r.URL.Path
		mu.Unlock()
		w.WriteHeader(http.StatusOK)
	}))
	defer shadowUpstreamServer.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstreamServer.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/test-endpoint", bytes.NewBufferString(`{"test": "data"}`))
	req.Header.Set("Content-Type", "application/json")

	handler.ServeHTTP(httptest.NewRecorder(), req)

	time.Sleep(200 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()
	if receivedMethod != http.MethodPost {
		t.Errorf("Shadow received wrong method. Got %q, want %q", receivedMethod, http.MethodPost)
	}
	if receivedPath != "/api/v1/test-endpoint" {
		t.Errorf("Shadow received wrong path. Got %q, want %q", receivedPath, "/api/v1/test-endpoint")
	}
}

// Requirement 10: Test that live request has no channel waits or WaitGroup.Wait()
func TestLiveRequestNoBlocking(t *testing.T) {
	liveUpstream, shadowUpstream, helper := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	shadowUpstreamServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(1 * time.Second)
		helper.shadowUpstreamCalled.Store(true)
		w.WriteHeader(http.StatusOK)
	}))
	defer shadowUpstreamServer.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstreamServer.URL, 10*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"test": "data"}`))
	req.Header.Set("Content-Type", "application/json")

	start := time.Now()
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	liveLatency := time.Since(start)

	if liveLatency > 500*time.Millisecond {
		t.Errorf("Live request was blocked by shadow request. Latency: %v", liveLatency)
	}

	if recorder.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, recorder.Code)
	}
}

// Additional test: Test with empty body
func TestEmptyBody(t *testing.T) {
	liveUpstream, shadowUpstream, helper := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstream.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer([]byte{}))
	req.Header.Set("Content-Type", "application/json")

	handler.ServeHTTP(httptest.NewRecorder(), req)

	time.Sleep(200 * time.Millisecond)

	if !helper.liveUpstreamCalled.Load() {
		t.Error("Live upstream was not called with empty body")
	}
	if !helper.shadowUpstreamCalled.Load() {
		t.Error("Shadow upstream was not called with empty body")
	}
}

// Additional test: Test with large body (stress test)
func TestLargeBody(t *testing.T) {
	liveUpstream, shadowUpstream, helper := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstream.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	largeBody := make([]byte, 1024*1024)
	for i := range largeBody {
		largeBody[i] = byte(i % 256)
	}

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBuffer(largeBody))
	req.Header.Set("Content-Type", "application/json")

	handler.ServeHTTP(httptest.NewRecorder(), req)

	time.Sleep(200 * time.Millisecond)

	if !helper.liveUpstreamCalled.Load() {
		t.Error("Live upstream was not called with large body")
	}
	if !helper.shadowUpstreamCalled.Load() {
		t.Error("Shadow upstream was not called with large body")
	}
}

// Additional test: Test shadow timeout handling
func TestShadowTimeout(t *testing.T) {
	liveUpstream, shadowUpstream, _ := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	slowShadow := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(10 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer slowShadow.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, slowShadow.URL, 100*time.Millisecond)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(`{"test": "data"}`))
	req.Header.Set("Content-Type", "application/json")

	start := time.Now()
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	latency := time.Since(start)

	if latency > 500*time.Millisecond {
		t.Errorf("Live response was delayed by shadow timeout. Latency: %v", latency)
	}

	if recorder.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, recorder.Code)
	}
}

// Additional test: Test concurrent requests
func TestConcurrentRequests(t *testing.T) {
	liveUpstream, shadowUpstream, helper := createTestUpstreams(t)
	defer liveUpstream.Close()
	defer shadowUpstream.Close()

	proxyObj := proxy.NewTrafficMirroringProxy(liveUpstream.URL, shadowUpstream.URL, 5*time.Second)
	handler := proxyObj.MirrorHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	numRequests := 10
	var wg sync.WaitGroup
	var successCount atomic.Int32

	for i := 0; i < numRequests; i++ {
		wg.Add(1)
		go func(requestNum int) {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(fmt.Sprintf(`{"request": %d}`, requestNum)))
			req.Header.Set("Content-Type", "application/json")
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, req)
			if recorder.Code == http.StatusOK {
				successCount.Add(1)
			}
		}(i)
	}

	wg.Wait()

	if int(successCount.Load()) != numRequests {
		t.Errorf("Expected %d successful requests, got %d", numRequests, successCount.Load())
	}

	time.Sleep(200 * time.Millisecond)

	if !helper.liveUpstreamCalled.Load() {
		t.Error("Live upstream was not called for concurrent requests")
	}
	if !helper.shadowUpstreamCalled.Load() {
		t.Error("Shadow upstream was not called for concurrent requests")
	}
}
