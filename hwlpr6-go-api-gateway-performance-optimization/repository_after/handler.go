package gateway

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"time"
)

var httpClient = &http.Client{
	Timeout: 60 * time.Second,
	Transport: &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:          2000,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		MaxIdleConnsPerHost:   1000,
	},
}

func ProxyHandler(backendURL string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := getBodyFromContextOrRead(r)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			return
		}

		// Strip /api/ prefix from path before forwarding
		path := r.URL.Path
		if len(path) >= 5 && path[:5] == "/api/" {
			path = path[4:] // Keep the leading slash, so "/api/foo" becomes "/foo"
		}

		req, err := http.NewRequest(r.Method, backendURL+path, bytes.NewReader(body))
		if err != nil {
			http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
			return
		}

		for key, values := range r.Header {
			for _, value := range values {
				req.Header.Add(key, value)
			}
		}

		req.Header.Set("X-Forwarded-For", r.RemoteAddr)
		req.Header.Set("X-Forwarded-Host", r.Host)

		resp, err := httpClient.Do(req)
		if err != nil {
			log.Printf("Proxy error: %v", err)
			http.Error(w, "Backend unavailable", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Backend read error: %v", err)
			http.Error(w, "Failed to read backend response", http.StatusBadGateway)
			return
		}

		if resp.StatusCode >= 400 {
			log.Printf("Backend returned status: %d", resp.StatusCode)
		}

		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}

		w.WriteHeader(resp.StatusCode)
		w.Write(respBody)
	})
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func MetricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GetMetrics())
}

func GetLogsHandler(w http.ResponseWriter, r *http.Request) {
	logs := GetRequestLogs()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

func ClearLogsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ClearRequestLogs()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "cleared"})
}

type Router struct {
	routes      map[string]http.Handler
	middlewares []Middleware
}

func NewRouter() *Router {
	return &Router{
		routes:      make(map[string]http.Handler),
		middlewares: []Middleware{},
	}
}

func (rt *Router) Use(mw Middleware) {
	rt.middlewares = append(rt.middlewares, mw)
}

func (rt *Router) Handle(pattern string, handler http.Handler) {
	rt.routes[pattern] = handler
}

func (rt *Router) HandleFunc(pattern string, handler func(http.ResponseWriter, *http.Request)) {
	rt.routes[pattern] = http.HandlerFunc(handler)
}

func (rt *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	handler, exists := rt.routes[r.URL.Path]
	if !exists {
		for pattern, h := range rt.routes {
			if matchPattern(pattern, r.URL.Path) {
				handler = h
				exists = true
				break
			}
		}
	}

	if !exists {
		http.NotFound(w, r)
		return
	}

	final := handler
	for i := len(rt.middlewares) - 1; i >= 0; i-- {
		final = rt.middlewares[i](final)
	}

	final.ServeHTTP(w, r)
}

func matchPattern(pattern, path string) bool {
	if pattern == path {
		return true
	}

	if len(pattern) > 0 && pattern[len(pattern)-1] == '/' {
		return len(path) >= len(pattern) && path[:len(pattern)] == pattern
	}

	return false
}

func SetupGateway(backendURL string) *Router {
	router := NewRouter()

	limiter := NewRateLimiter(100, time.Minute)

	// BodyLimitMiddleware first: single read with 10MB limit so downstream middleware/handlers read from memory.
	router.Use(BodyLimitMiddleware)
	router.Use(MetricsMiddleware)
	router.Use(LoggingMiddleware)
	router.Use(CompressionMiddleware)
	router.Use(RateLimitMiddleware(limiter))
	router.Use(AuthMiddleware)

	router.HandleFunc("/health", HealthHandler)
	router.HandleFunc("/metrics", MetricsHandler)
	router.HandleFunc("/logs", GetLogsHandler)
	router.HandleFunc("/logs/clear", ClearLogsHandler)

	router.Handle("/api/", ProxyHandler(backendURL))

	return router
}
