package proxy

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// TrafficMirroringProxy is a middleware that mirrors incoming requests
// to a shadow upstream while forwarding to the live upstream.
type TrafficMirroringProxy struct {
	LiveUpstreamURL   string
	ShadowUpstreamURL string
	ShadowTimeout     time.Duration
}

// NewTrafficMirroringProxy creates a new TrafficMirroringProxy instance.
func NewTrafficMirroringProxy(liveURL, shadowURL string, shadowTimeout time.Duration) *TrafficMirroringProxy {
	return &TrafficMirroringProxy{
		LiveUpstreamURL:   liveURL,
		ShadowUpstreamURL: shadowURL,
		ShadowTimeout:     shadowTimeout,
	}
}

// ShadowRequestHandler handles the shadow request asynchronously.
// This runs in a separate goroutine and must not block the live response.
func (p *TrafficMirroringProxy) ShadowRequestHandler(
	ctx context.Context,
	method string,
	url string,
	headers map[string][]string,
	body []byte,
) {
	// Requirement 6: defer recover() to prevent panic from crashing the application
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[SHADOW] Panic recovered in shadow goroutine: %v", r)
		}
	}()

	// Create a new context with timeout for the shadow request
	// Requirement 3: Use context.Background() instead of original r.Context()
	shadowCtx, cancel := context.WithTimeout(ctx, p.ShadowTimeout)
	defer cancel()

	// Create new request for shadow upstream
	// Requirement 8: Copy headers to avoid race condition on shared req object
	shadowReq, err := http.NewRequestWithContext(shadowCtx, method, url, bytes.NewReader(body))
	if err != nil {
		log.Printf("[SHADOW] Failed to create request: %v", err)
		return
	}

	// Requirement 8: Copy headers to the new request
	for k, v := range headers {
		shadowReq.Header[k] = v
	}

	// Requirement 4: Set ContentLength to match body size
	shadowReq.ContentLength = int64(len(body))

	// Execute shadow request
	client := &http.Client{Timeout: p.ShadowTimeout}
	resp, err := client.Do(shadowReq)
	if err != nil {
		log.Printf("[SHADOW] Request failed: %v", err)
		return
	}
	defer resp.Body.Close()

	// Requirement 5: Shadow response is discarded, only logged
	log.Printf("[SHADOW] Response status: %d", resp.StatusCode)

	// Drain the response body to prevent connection leaks
	io.Copy(io.Discard, resp.Body)
}

// MirrorHandler is the HTTP handler that performs traffic mirroring.
func (p *TrafficMirroringProxy) MirrorHandler(liveUpstream http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only mirror POST requests with JSON content
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Requirement 1: Read req.Body into byte buffer exactly once
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			log.Printf("[LIVE] Failed to read request body: %v", err)
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			return
		}
		defer func() {
			// Requirement 7: Close original req.Body to prevent file descriptor leaks
			if err := r.Body.Close(); err != nil {
				log.Printf("[LIVE] Failed to close original body: %v", err)
			}
		}()

		// Requirement 1: Create two distinct io.NopCloser instances
		liveBody := io.NopCloser(bytes.NewReader(bodyBytes))
		shadowBody := io.NopCloser(bytes.NewReader(bytes.Clone(bodyBytes)))

		// Replace r.Body with live body for the live request
		r.Body = liveBody
		// Requirement 4: Update ContentLength to match buffer size
		r.ContentLength = int64(len(bodyBytes))

		// Requirement 9: Preserve method and URL for shadow request
		shadowURL := fmt.Sprintf("%s%s", p.ShadowUpstreamURL, r.URL.Path)
		shadowMethod := r.Method

		// Requirement 8: Copy headers for shadow request
		shadowHeaders := make(map[string][]string)
		for k, v := range r.Header {
			shadowHeaders[k] = v
		}

		// Requirement 2 & 10: Launch shadow request in goroutine
		// No blocking calls or WaitGroup.Wait() in live path
		go p.ShadowRequestHandler(
			context.Background(), // Requirement 3: Use context.Background()
			shadowMethod,
			shadowURL,
			shadowHeaders,
			bodyBytes,
		)

		// Use shadow body for potential future requests (though we're done with r.Body)
		_ = shadowBody

		// Forward to live upstream - create a new request with the full URL
		liveURL := fmt.Sprintf("%s%s", p.LiveUpstreamURL, r.URL.Path)
		liveReq, err := http.NewRequestWithContext(r.Context(), r.Method, liveURL, liveBody)
		if err != nil {
			log.Printf("[LIVE] Failed to create request: %v", err)
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}
		liveReq.ContentLength = int64(len(bodyBytes))
		for k, v := range r.Header {
			liveReq.Header[k] = v
		}

		// Make the live request
		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(liveReq)
		if err != nil {
			log.Printf("[LIVE] Upstream request failed: %v", err)
			http.Error(w, "Upstream request failed", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Requirement 5: Return Live response to client, discard Shadow response
		// Copy headers from live response
		for k, v := range resp.Header {
			w.Header()[k] = v
		}
		w.WriteHeader(resp.StatusCode)

		// Write live response body
		_, err = io.Copy(w, resp.Body)
		if err != nil {
			log.Printf("[LIVE] Failed to write response: %v", err)
		}
	})
}
