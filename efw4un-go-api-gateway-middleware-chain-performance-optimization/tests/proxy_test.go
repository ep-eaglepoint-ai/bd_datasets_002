package main_test

import (
	"apigateway/gateway"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestProxyHandler_ClientDisconnect(t *testing.T) {
	// Setup mock backend
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond) // Simulate work
		w.WriteHeader(200)
	}))
	defer backend.Close()

	client := gateway.NewHTTPClient()
	proxy := gateway.NewProxyHandler(client, backend.URL)

	// Simulate client request with short context
	req := httptest.NewRequest("GET", "/", nil)
	ctx, cancel := context.WithCancel(context.Background())
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()

	// Cancel context immediately
	cancel()

	proxy.ServeHTTP(rr, req)

	// Handler should return immediately, likely with no writes or partial
	// Since we cancel before even starting, it might simply return.
	// We check if it respected context (didn't panic, returned).
}

func TestProxyHandler_ClosesBody(t *testing.T) {
	// Hard to test closing directly without mocking the Transport/Client specifically to interception.
	// But we can verify it doesn't leak FDs in the load test.
	// Here we verify basic proxy functionality.

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(201)
		w.Write([]byte("backend_response"))
	}))
	defer backend.Close()

	client := gateway.NewHTTPClient()
	proxy := gateway.NewProxyHandler(client, backend.URL)

	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()

	proxy.ServeHTTP(rr, req)

	if rr.Code != 201 {
		t.Errorf("Expected 201, got %d", rr.Code)
	}
	if rr.Body.String() != "backend_response" {
		t.Errorf("Expected body 'backend_response', got '%s'", rr.Body.String())
	}
}
