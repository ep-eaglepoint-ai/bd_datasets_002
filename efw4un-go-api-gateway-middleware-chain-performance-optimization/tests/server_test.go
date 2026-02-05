package main_test

import (
	"context"
	"net/http"
	"testing"
	"time"
)

func TestGracefulShutdown(t *testing.T) {
	// Simple handler that takes some time
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})

	srv := &http.Server{
		Addr:    ":0", // Random available port
		Handler: handler,
	}

	idleConnsClosed := make(chan struct{})
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			t.Errorf("ListenAndServe(): %v", err)
		}
		close(idleConnsClosed)
	}()

	// Give it a moment to start
	time.Sleep(50 * time.Millisecond)

	// Trigger shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		t.Errorf("Shutdown failed: %v", err)
	}

	select {
	case <-idleConnsClosed:
		// Success
	case <-time.After(3 * time.Second):
		t.Error("Server did not shut down in time")
	}
}
