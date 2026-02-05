package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/eaglepoint/eventstore/pkg/api"
	"github.com/eaglepoint/eventstore/pkg/eventstore"
	_ "github.com/lib/pq"
)

func main() {
	// Connect to database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/eventstore?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Create event store
	store, err := eventstore.NewPostgresStore(db, nil, nil)
	if err != nil {
		log.Fatalf("Failed to create event store: %v", err)
	}

	// Create event browser API
	browserAPI := api.NewEventBrowserAPI(store)

	// Start HTTP server
	server := &http.Server{
		Addr:    ":8080",
		Handler: browserAPI,
	}

	go func() {
		log.Println("Starting event store server on :8080")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
