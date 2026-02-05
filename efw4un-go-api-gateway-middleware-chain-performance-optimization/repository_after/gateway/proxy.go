package gateway

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
)

type ProxyHandler struct {
	client    *HTTPClient
	targetURL string
}

func NewProxyHandler(client *HTTPClient, targetURL string) *ProxyHandler {
	return &ProxyHandler{
		client:    client,
		targetURL: targetURL,
	}
}

func (p *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Check for client disconnect before starting
	if r.Context().Err() != nil {
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	targetURL := p.targetURL + r.URL.Path
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	// Propagate context to the backend request
	proxyReq, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, bytes.NewReader(body))
	if err != nil {
		http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
		return
	}

	for key, values := range r.Header {
		for _, value := range values {
			proxyReq.Header.Add(key, value)
		}
	}

	resp, err := p.client.Do(proxyReq)
	if err != nil {
		// Log error or handle specific cases
		http.Error(w, fmt.Sprintf("Backend error: %v", err), http.StatusBadGateway)
		return
	}
	// CRITICAL: Ensure body is closed to prevent FD leaks
	defer resp.Body.Close()

	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	w.WriteHeader(resp.StatusCode)

	// Stream response directly to avoid memory bloat
	// Also check for context cancellation during copy if needed (io.Copy puts load on this)
	_, _ = io.Copy(w, resp.Body)
}
