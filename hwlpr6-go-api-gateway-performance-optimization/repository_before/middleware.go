package gateway

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

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

var requestLogs []RequestLog
var logMutex sync.Mutex

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		body, _ := io.ReadAll(r.Body)
		r.Body.Close()

		headers := make(map[string]string)
		for k, v := range r.Header {
			headers[k] = strings.Join(v, ", ")
		}

		r.Body = io.NopCloser(bytes.NewReader(body))

		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)

		logEntry := RequestLog{
			Timestamp:  start,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: rw.statusCode,
			Duration:   time.Since(start),
			ClientIP:   r.RemoteAddr,
			Headers:    headers,
			Body:       string(body),
		}

		logMutex.Lock()
		requestLogs = append(requestLogs, logEntry)
		logMutex.Unlock()

		log.Printf("[%s] %s %s - %d (%v)", r.RemoteAddr, r.Method, r.URL.Path, rw.statusCode, time.Since(start))
	})
}

type AuthConfig struct {
	APIKeys    map[string]string
	JWTSecret  string
	SkipPaths  []string
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

func (rl *RateLimiter) Allow(clientID string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	timestamps := rl.requests[clientID]
	var valid []time.Time
	for _, ts := range timestamps {
		if ts.After(windowStart) {
			valid = append(valid, ts)
		}
	}

	if len(valid) >= rl.limit {
		rl.requests[clientID] = valid
		return false
	}

	valid = append(valid, now)
	rl.requests[clientID] = valid
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

			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Failed to read body", http.StatusBadRequest)
				return
			}
			r.Body.Close()

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

			r.Body = io.NopCloser(bytes.NewReader(body))
			next.ServeHTTP(w, r)
		})
	}
}

func CompressionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Content-Encoding") == "gzip" {
			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Failed to read body", http.StatusBadRequest)
				return
			}
			r.Body.Close()

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

			r.Body = io.NopCloser(bytes.NewReader(decompressed))
			r.Header.Del("Content-Encoding")
		}

		next.ServeHTTP(w, r)
	})
}

type Metrics struct {
	TotalRequests   int64
	TotalErrors     int64
	TotalLatency    time.Duration
	RequestsByPath  map[string]int64
	ErrorsByPath    map[string]int64
	mu              sync.Mutex
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
		"total_requests":    metrics.TotalRequests,
		"total_errors":      metrics.TotalErrors,
		"avg_latency_ms":    avgLatency.Milliseconds(),
		"requests_by_path":  metrics.RequestsByPath,
		"errors_by_path":    metrics.ErrorsByPath,
	}
}

func GetRequestLogs() []RequestLog {
	logMutex.Lock()
	defer logMutex.Unlock()
	
	result := make([]RequestLog, len(requestLogs))
	copy(result, requestLogs)
	return result
}

func ClearRequestLogs() {
	logMutex.Lock()
	defer logMutex.Unlock()
	requestLogs = nil
}

func ChainMiddleware(middlewares ...Middleware) Middleware {
	return func(final http.Handler) http.Handler {
		for i := len(middlewares) - 1; i >= 0; i-- {
			final = middlewares[i](final)
		}
		return final
	}
}

