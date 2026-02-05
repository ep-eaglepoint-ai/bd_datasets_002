package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"apigateway/gateway"
)

func main() {
	client := gateway.NewHTTPClient()
	rateLimiter := gateway.NewRateLimiter(500, 500) // Adjusted for success criteria (500 RPS)

	handler := gateway.NewProxyHandler(client, "http://localhost:8081")

	chain := gateway.LoggingMiddleware(
		gateway.AuthMiddleware(
			gateway.RateLimitMiddleware(rateLimiter)(handler),
		),
	)

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      chain,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Println("API Gateway starting on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe(): %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown: ", err)
	}

	log.Println("Server exiting")
}
