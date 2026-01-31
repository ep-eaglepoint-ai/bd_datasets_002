package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"traffic-mirroring/proxy"
)

// SimpleUpstreamHandler creates a simple handler that responds with the request body
func SimpleUpstreamHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read body", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(fmt.Sprintf(`{"received": %q, "method": %q}`, string(body), r.Method)))
	}
}

func main() {
	liveUpstream := http.HandlerFunc(SimpleUpstreamHandler())
	shadowUpstream := http.HandlerFunc(SimpleUpstreamHandler())

	// Create mock upstreams for testing (in real scenario, these would be actual servers)
	go func() {
		log.Println("Shadow upstream listening on :8082")
		log.Fatal(http.ListenAndServe(":8082", shadowUpstream))
	}()

	go func() {
		log.Println("Live upstream listening on :8081")
		log.Fatal(http.ListenAndServe(":8081", liveUpstream))
	}()

	// Create proxy that mirrors to shadow upstream
	// Note: In a real scenario, you would configure the proxy to mirror to a real shadow service
	p := proxy.NewTrafficMirroringProxy("http://localhost:8081", "http://localhost:8082", 5*time.Second)
	mirroredHandler := p.MirrorHandler(liveUpstream)

	log.Println("Traffic mirroring proxy listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mirroredHandler))
}
