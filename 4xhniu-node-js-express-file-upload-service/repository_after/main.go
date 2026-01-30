package main

// We need to import the service package.
// Since we are in the same module 'file-upload-service', 
// and main is at root, we import "file-upload-service/service"

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"file-upload-service/service"
)

const (
	Port              = ":8080"
	MaxConcurrentUploads = 10
	ShutdownTimeout   = 10 * time.Second
)

func main() {
	if err := service.InitDB("uploads.db"); err != nil {
		log.Fatalf("Failed to init DB: %v", err)
	}
	defer service.CloseDB()

	service.InitStorage()
	service.StartCleanupTask()

	uploadLimiter := make(chan struct{}, MaxConcurrentUploads)

	mux := http.NewServeMux()
	mux.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		select {
		case uploadLimiter <- struct{}{}:
			defer func() { <-uploadLimiter }()
			service.HandleUpload(w, r)
		default:
			http.Error(w, "Server too busy", http.StatusServiceUnavailable)
		}
	})

	server := &http.Server{
		Addr:    Port,
		Handler: mux,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Server listening on %s", Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Listen: %v", err)
		}
	}()

	<-stop
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), ShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}
