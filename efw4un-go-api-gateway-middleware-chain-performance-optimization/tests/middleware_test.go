package main_test

import (
	"apigateway/gateway"
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLoggingMiddleware_RestoresBody(t *testing.T) {
	// Setup
	reqBody := []byte(`{"test":"data"}`)
	req := httptest.NewRequest("POST", "/test", bytes.NewReader(reqBody))
	rr := httptest.NewRecorder()

	// Handler that checks if body is readable
	finalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("Failed to read body in final handler: %v", err)
		}
		if string(body) != string(reqBody) {
			t.Errorf("Body mismatch in final handler. Got %s, want %s", body, reqBody)
		}
		w.WriteHeader(200)
	})

	// Execute
	handler := gateway.LoggingMiddleware(finalHandler)
	handler.ServeHTTP(rr, req)

	// Verify response check not needed for this test, but good practice
	if rr.Code != 200 {
		t.Errorf("Handler failed with status %d", rr.Code)
	}
}

func TestRateLimitMiddleware_IPExtraction(t *testing.T) {
	limiter := gateway.NewRateLimiter(10, 1) // High limit to allow
	handler := gateway.RateLimitMiddleware(limiter)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))

	// Test with port
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Errorf("Expected 200, got %d", rr.Code)
	}

	// Exhaust tokens for this IP
	for i := 0; i < 9; i++ {
		handler.ServeHTTP(httptest.NewRecorder(), req)
	}

	// Next one should fail
	rrKey := httptest.NewRecorder()
	handler.ServeHTTP(rrKey, req)
	if rrKey.Code != 429 {
		t.Errorf("Expected 429 after exhaustion, got %d", rrKey.Code)
	}

	// Verify different port SAME IP is also blocked (Proof of stripping)
	reqDiffPort := httptest.NewRequest("GET", "/", nil)
	reqDiffPort.RemoteAddr = "192.168.1.1:54321"
	rrDiff := httptest.NewRecorder()
	handler.ServeHTTP(rrDiff, reqDiffPort)
	if rrDiff.Code != 429 {
		t.Errorf("Expected 429 for same IP different port, got %d", rrDiff.Code)
	}
}
