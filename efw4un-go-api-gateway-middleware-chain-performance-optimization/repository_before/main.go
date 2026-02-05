package main

import (
	"log"
	"net/http"
)

func main() {
	client := NewHTTPClient()
	rateLimiter := NewRateLimiter(100, 10)

	handler := NewProxyHandler(client, "http://localhost:8081")

	chain := LoggingMiddleware(
		AuthMiddleware(
			RateLimitMiddleware(rateLimiter)(handler),
		),
	)

	log.Println("API Gateway starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", chain))
}

