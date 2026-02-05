package gateway

import (
	"bytes"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"time"
)

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		body, _ := io.ReadAll(r.Body)
		// Restore the body so downstream handlers can read it
		r.Body = io.NopCloser(bytes.NewBuffer(body))

		logBody := string(body)
		if len(logBody) > 1000 {
			logBody = logBody[:1000] + "...(truncated)"
		}
		log.Printf("REQUEST: %s %s Body: %s", r.Method, r.URL.Path, logBody)

		recorder := &responseRecorder{ResponseWriter: w, statusCode: 200}
		next.ServeHTTP(recorder, r)

		logResp := string(recorder.body)
		if len(logResp) > 1000 {
			logResp = logResp[:1000] + "...(truncated)"
		}
		log.Printf("RESPONSE: %d Body: %s Duration: %v", recorder.statusCode, logResp, time.Since(start))
	})
}

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	body       []byte
}

func (r *responseRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	// Capture body for logging if needed, avoiding expensive unmarshal
	// Append safely
	r.body = append(r.body, b...)
	return r.ResponseWriter.Write(b)
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")

		if authHeader == "" {
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")

		valid := validateToken(token)
		if !valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func validateToken(token string) bool {
	// Simulated validation
	return len(token) > 10
}

func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				// Fallback if no port is present or other error
				ip = r.RemoteAddr
			}

			if !limiter.Allow(ip) {
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
