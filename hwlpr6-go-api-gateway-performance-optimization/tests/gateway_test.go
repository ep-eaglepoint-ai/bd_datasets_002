package gateway_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"runtime"
	"strings"
	"testing"

	"gateway"
)

func TestMain(m *testing.M) {
	// Suppress gateway log output during tests so terminal stays readable
	log.SetOutput(io.Discard)
	m.Run()
}

func TestHealthReturns200AndJSON(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("GET /health: status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("GET /health: Content-Type = %q, want application/json", ct)
	}
	var m map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&m); err != nil {
		t.Errorf("GET /health: invalid JSON: %v", err)
	}
	if m["status"] != "healthy" {
		t.Errorf("GET /health: status = %v, want healthy", m["status"])
	}
}

func TestMetricsReturns200AndJSON(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("GET /metrics: status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("GET /metrics: Content-Type = %q, want application/json", ct)
	}
	var m map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&m); err != nil {
		t.Errorf("GET /metrics: invalid JSON: %v", err)
	}
}

func TestLogsReturns200AndArray(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer backend.Close()

	gateway.ClearRequestLogs()
	router := gateway.SetupGateway(backend.URL)
	req := httptest.NewRequest(http.MethodGet, "/logs", nil)
	req.Header.Set("Authorization", "Bearer valid_token_length_ok")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("GET /logs: status = %d, want 200", rec.Code)
	}
	var logs []interface{}
	if err := json.NewDecoder(rec.Body).Decode(&logs); err != nil {
		t.Errorf("GET /logs: invalid JSON array: %v", err)
	}
}

func TestClearLogsReturns200(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)
	req := httptest.NewRequest(http.MethodPost, "/logs/clear", nil)
	req.Header.Set("Authorization", "Bearer valid_token_length_ok")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("POST /logs/clear: status = %d, want 200", rec.Code)
	}
}

func TestHealthAndMetricsSkipAuth(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)

	for _, path := range []string{"/health", "/metrics"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("GET %s without auth: status = %d, want 200", path, rec.Code)
		}
	}
}

func TestLogsRequiresAuth(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)
	req := httptest.NewRequest(http.MethodGet, "/logs", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("GET /logs without auth: status = %d, want 401", rec.Code)
	}
}

// TestRequestBodyOver10MBReturns413 is FAIL_TO_PASS: before has no 10MB limit (returns 200); after returns 413.
func TestRequestBodyOver10MBReturns413(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)
	body := bytes.Repeat([]byte("x"), 11*1024*1024) // 11MB
	req := httptest.NewRequest(http.MethodPost, "/logs/clear", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer valid_token_length_ok")
	req.ContentLength = int64(len(body))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("POST with 11MB body: status = %d, want 413", rec.Code)
	}
}

func TestNoGoroutineLeakUnderLoad(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)

	runtime.GC()
	startGoroutines := runtime.NumGoroutine()

	for i := 0; i < 200; i++ {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		// Use unique RemoteAddr per request so rate limiter (100/min per client) doesn't return 429
		req.RemoteAddr = fmt.Sprintf("10.0.0.%d:1234", 1+i%254)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("request %d: status = %d", i, rec.Code)
		}
	}

	runtime.GC()
	endGoroutines := runtime.NumGoroutine()
	delta := endGoroutines - startGoroutines
	if delta > 10 {
		t.Errorf("Potential goroutine leak: before=%d after=%d delta=%d (expected ≤10)", startGoroutines, endGoroutines, delta)
	}
}

func TestRequestBody10MBIsAccepted(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)
	body := bytes.Repeat([]byte("x"), 10*1024*1024) // 10MB
	req := httptest.NewRequest(http.MethodPost, "/api/foo", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer valid_token_length_ok")
	req.ContentLength = int64(len(body))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("POST with 10MB body: status = %d, want 200", rec.Code)
	}
}

func TestProxyContractValidation(t *testing.T) {
	targetPath := "/api/some/complex/path"
	targetMethod := "PUT"
	targetHeader := "X-Test-Header"
	targetHeaderVal := "test-value"
	targetBody := `{"test":"payload"}`

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/some/complex/path" {
			t.Errorf("Backend saw path %q, want %q", r.URL.Path, "/some/complex/path")
		}
		if r.Method != targetMethod {
			t.Errorf("Backend saw method %q, want %q", r.Method, targetMethod)
		}
		if r.Header.Get(targetHeader) != targetHeaderVal {
			t.Errorf("Backend saw header %q=%q, want %q", targetHeader, r.Header.Get(targetHeader), targetHeaderVal)
		}
		body, _ := io.ReadAll(r.Body)
		if string(body) != targetBody {
			t.Errorf("Backend saw body %q, want %q", string(body), targetBody)
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)
	req := httptest.NewRequest(targetMethod, targetPath, strings.NewReader(targetBody))
	req.Header.Set("Authorization", "Bearer valid_token_length_ok")
	req.Header.Set(targetHeader, targetHeaderVal)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("Proxy returned status %d, want 201", rec.Code)
	}
}

func TestRateLimiterAccuracy(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer backend.Close()

	router := gateway.SetupGateway(backend.URL)
	clientIP := "1.2.3.4:1234"

	// Rate limit is 100/min in SetupGateway. Let's hit it.
	for i := 0; i < 100; i++ {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		req.RemoteAddr = clientIP
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("Request %d failed prematurely: %d", i, rec.Code)
		}
	}

	// 101st should fail
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.RemoteAddr = clientIP
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("101st request: status = %d, want 429", rec.Code)
	}
}
