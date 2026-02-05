package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		body, _ := io.ReadAll(r.Body)
		log.Printf("REQUEST: %s %s Body: %s", r.Method, r.URL.Path, string(body))

		recorder := &responseRecorder{ResponseWriter: w, statusCode: 200}
		next.ServeHTTP(recorder, r)

		responseBody, _ := json.Marshal(recorder.body)
		log.Printf("RESPONSE: %d Body: %s Duration: %v", recorder.statusCode, string(responseBody), time.Since(start))
	})
}

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	body       interface{}
}

func (r *responseRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	json.Unmarshal(b, &r.body)
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
	time.Sleep(5 * time.Millisecond)
	return len(token) > 10
}

func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr

			if !limiter.Allow(ip) {
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

