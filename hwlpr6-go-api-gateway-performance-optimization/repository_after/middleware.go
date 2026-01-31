package gateway

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	maxBodySize      = 10 * 1024 * 1024 // 10MB
	maxRequestLogs   = 10000            // bounded log buffer
	maxRateLimitKeys = 50000            // cap rate limiter map growth
	maxLogBodyBytes  = 4096             // truncate body in logs to save memory
)

type contextKey string

const bodyContextKey contextKey = "request_body"

// Middleware func(http.Handler) http.Handler
type Middleware func(http.Handler) http.Handler

type RequestLog struct {
	Timestamp  time.Time         `json:"timestamp"`
	Method     string            `json:"method"`
	Path       string            `json:"path"`
	StatusCode int               `json:"status_code"`
	Duration   time.Duration     `json:"duration"`
	ClientIP   string            `json:"client_ip"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

// Bounded ring buffer for request logs to prevent unbounded memory growth.
type requestLogBuffer struct {
	entries []RequestLog
	head    int
	size    int
	mu      sync.Mutex
}

func newRequestLogBuffer(cap int) *requestLogBuffer {
	return &requestLogBuffer{
		entries: make([]RequestLog, cap),
		head:    0,
		size:    0,
	}
}

func (b *requestLogBuffer) append(entry RequestLog) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if len(b.entries) == 0 {
		return
	}
	if b.size < len(b.entries) {
		b.entries[b.size] = entry
		b.size++
	} else {
		b.entries[b.head] = entry
		b.head = (b.head + 1) % len(b.entries)
	}
}

func (b *requestLogBuffer) copyAll() []RequestLog {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.size == 0 {
		return nil
	}
	out := make([]RequestLog, b.size)
	if b.size < len(b.entries) {
		copy(out, b.entries[:b.size])
	} else {
		n := len(b.entries)
		for i := 0; i < n; i++ {
			out[i] = b.entries[(b.head+i)%n]
		}
	}
	return out
}

func (b *requestLogBuffer) clear() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.head = 0
	b.size = 0
}

var requestLogBuf = newRequestLogBuffer(maxRequestLogs)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// getBodyFromContextOrRead returns the body from context if available, otherwise it reads it.
func getBodyFromContextOrRead(r *http.Request) ([]byte, error) {
	if val := r.Context().Value(bodyContextKey); val != nil {
		if body, ok := val.([]byte); ok {
			return body, nil
		}
	}
	// Fallback to reading if not in context (though BodyLimitMiddleware should have put it there)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	r.Body.Close()
	// We don't replace r.Body here as we don't want side effects in this helper
	return body, nil
}

// BodyLimitMiddleware reads the request body once (max 10MB), stores it in context and
// replaces r.Body so downstream middleware and handlers read from memory. Returns 413 if body > 10MB.
func BodyLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body == nil {
			next.ServeHTTP(w, r)
			return
		}

		limited := io.LimitReader(r.Body, maxBodySize+1)
		body, err := io.ReadAll(limited)
		r.Body.Close()
		if err != nil {
			http.Error(w, "Failed to read body", http.StatusBadRequest)
			return
		}
		if len(body) > maxBodySize {
			http.Error(w, "Request Entity Too Large", http.StatusRequestEntityTooLarge)
			return
		}
		ctx := context.WithValue(r.Context(), bodyContextKey, body)
		r.Body = io.NopCloser(bytes.NewReader(body))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		body, _ := getBodyFromContextOrRead(r)
		// Restore body for next handlers if we read it
		if r.Context().Value(bodyContextKey) == nil {
			r.Body = io.NopCloser(bytes.NewReader(body))
		}

		headers := make(map[string]string)
		for k, v := range r.Header {
			headers[k] = strings.Join(v, ", ")
		}

		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)

		logBody := string(body)
		if len(logBody) > maxLogBodyBytes {
			// Force copy to avoid retaining the large underlying array of 'body'
			logBody = string([]byte(logBody[:maxLogBodyBytes])) + "..."
		}
		logEntry := RequestLog{
			Timestamp:  start,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: rw.statusCode,
			Duration:   time.Since(start),
			ClientIP:   r.RemoteAddr,
			Headers:    headers,
			Body:       logBody,
		}

		requestLogBuf.append(logEntry)
		log.Printf("[%s] %s %s - %d (%v)", r.RemoteAddr, r.Method, r.URL.Path, rw.statusCode, time.Since(start))
	})
}

type AuthConfig struct {
	APIKeys   map[string]string
	JWTSecret string
	SkipPaths []string
}

var authConfig = &AuthConfig{
	APIKeys:   make(map[string]string),
	SkipPaths: []string{"/health", "/metrics"},
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		for _, path := range authConfig.SkipPaths {
			if r.URL.Path == path {
				next.ServeHTTP(w, r)
				return
			}
		}

		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" {
			apiKey = r.URL.Query().Get("api_key")
		}

		if apiKey != "" {
			if _, valid := authConfig.APIKeys[apiKey]; valid {
				next.ServeHTTP(w, r)
				return
			}
		}

		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			if validateJWT(token) {
				next.ServeHTTP(w, r)
				return
			}
		}

		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	})
}

func validateJWT(token string) bool {
	return len(token) > 10
}

type RateLimiter struct {
	requests map[string][]time.Time
	limit    int
	window   time.Duration
	mu       sync.Mutex
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

func (rl *RateLimiter) evictStaleClients(now time.Time) {
	if len(rl.requests) <= maxRateLimitKeys {
		return
	}
	windowStart := now.Add(-rl.window)
	for clientID, timestamps := range rl.requests {
		if len(timestamps) == 0 {
			delete(rl.requests, clientID)
			continue
		}
		if timestamps[len(timestamps)-1].Before(windowStart) {
			delete(rl.requests, clientID)
		}
	}
}

func (rl *RateLimiter) Allow(clientID string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	rl.evictStaleClients(now)

	timestamps := rl.requests[clientID]

	// Efficiently find the first timestamp within the window
	i := 0
	for i < len(timestamps) && !timestamps[i].After(windowStart) {
		i++
	}

	if i > 0 {
		// Remove expired timestamps
		copy(timestamps, timestamps[i:])
		timestamps = timestamps[:len(timestamps)-i]
	}

	if len(timestamps) >= rl.limit {
		rl.requests[clientID] = timestamps
		return false
	}

	rl.requests[clientID] = append(timestamps, now)
	return true
}

func RateLimitMiddleware(limiter *RateLimiter) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			clientIP := r.RemoteAddr

			if !limiter.Allow(clientIP) {
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

type ValidationRule struct {
	Field    string
	Required bool
	MinLen   int
	MaxLen   int
}

func ValidationMiddleware(rules []ValidationRule) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost && r.Method != http.MethodPut {
				next.ServeHTTP(w, r)
				return
			}

			body, err := getBodyFromContextOrRead(r)
			if err != nil {
				http.Error(w, "Failed to read body", http.StatusBadRequest)
				return
			}
			// Restore body for next handlers if we read it
			if r.Context().Value(bodyContextKey) == nil {
				r.Body = io.NopCloser(bytes.NewReader(body))
			}

			var data map[string]interface{}
			if err := json.Unmarshal(body, &data); err != nil {
				http.Error(w, "Invalid JSON", http.StatusBadRequest)
				return
			}

			for _, rule := range rules {
				val, exists := data[rule.Field]
				if rule.Required && !exists {
					http.Error(w, "Missing field: "+rule.Field, http.StatusBadRequest)
					return
				}

				if str, ok := val.(string); ok {
					if rule.MinLen > 0 && len(str) < rule.MinLen {
						http.Error(w, "Field too short: "+rule.Field, http.StatusBadRequest)
						return
					}
					if rule.MaxLen > 0 && len(str) > rule.MaxLen {
						http.Error(w, "Field too long: "+rule.Field, http.StatusBadRequest)
						return
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

func CompressionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Content-Encoding") == "gzip" {
			body, err := getBodyFromContextOrRead(r)
			if err != nil {
				http.Error(w, "Failed to read body", http.StatusBadRequest)
				return
			}

			gzReader, err := gzip.NewReader(bytes.NewReader(body))
			if err != nil {
				http.Error(w, "Invalid gzip", http.StatusBadRequest)
				return
			}

			decompressed, err := io.ReadAll(gzReader)
			gzReader.Close()
			if err != nil {
				http.Error(w, "Decompression failed", http.StatusBadRequest)
				return
			}

			// Since decompression changes the body, we SHOULD replace it in context if we want pure optimization,
			// but for now we just replace r.Body for downstream
			r.Body = io.NopCloser(bytes.NewReader(decompressed))
			r.Header.Del("Content-Encoding")
		}

		next.ServeHTTP(w, r)
	})
}

type Metrics struct {
	TotalRequests  int64
	TotalErrors    int64
	TotalLatency   time.Duration
	RequestsByPath map[string]int64
	ErrorsByPath   map[string]int64
	mu             sync.Mutex
}

var metrics = &Metrics{
	RequestsByPath: make(map[string]int64),
	ErrorsByPath:   make(map[string]int64),
}

func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)

		metrics.mu.Lock()
		metrics.TotalRequests++
		metrics.TotalLatency += time.Since(start)
		metrics.RequestsByPath[r.URL.Path]++

		if rw.statusCode >= 400 {
			metrics.TotalErrors++
			metrics.ErrorsByPath[r.URL.Path]++
		}
		metrics.mu.Unlock()
	})
}

func GetMetrics() map[string]interface{} {
	metrics.mu.Lock()
	defer metrics.mu.Unlock()

	avgLatency := time.Duration(0)
	if metrics.TotalRequests > 0 {
		avgLatency = metrics.TotalLatency / time.Duration(metrics.TotalRequests)
	}

	return map[string]interface{}{
		"total_requests":   metrics.TotalRequests,
		"total_errors":     metrics.TotalErrors,
		"avg_latency_ms":   avgLatency.Milliseconds(),
		"requests_by_path": metrics.RequestsByPath,
		"errors_by_path":   metrics.ErrorsByPath,
	}
}

func GetRequestLogs() []RequestLog {
	return requestLogBuf.copyAll()
}

func ClearRequestLogs() {
	requestLogBuf.clear()
}

func ChainMiddleware(middlewares ...Middleware) Middleware {
	return func(final http.Handler) http.Handler {
		for i := len(middlewares) - 1; i >= 0; i-- {
			final = middlewares[i](final)
		}
		return final
	}
}
