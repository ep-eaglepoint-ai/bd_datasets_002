package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/mux"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func authMiddlewareCtx(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		userID, _, err := validateToken(token)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", userID)
		next(w, r.WithContext(ctx))
	}
}

func main() {
	db := initDB()
	defer db.Close()

	hub := newHub()
	go hub.run()

	server := &Server{db: db, hub: hub}

	r := mux.NewRouter()

	r.HandleFunc("/api/auth/register", server.register).Methods("POST")
	r.HandleFunc("/api/auth/login", server.login).Methods("POST")
	r.HandleFunc("/api/boards", authMiddlewareCtx(server.getBoards)).Methods("GET")
	r.HandleFunc("/api/boards", authMiddlewareCtx(server.createBoard)).Methods("POST")
	r.HandleFunc("/api/boards/{id}", authMiddlewareCtx(server.getBoard)).Methods("GET")
	r.HandleFunc("/api/boards/{id}/tasks", authMiddlewareCtx(server.createTask)).Methods("POST")
	r.HandleFunc("/api/tasks/{id}", authMiddlewareCtx(server.updateTask)).Methods("PUT")
	r.HandleFunc("/api/tasks/{id}", authMiddlewareCtx(server.deleteTask)).Methods("DELETE")
	r.HandleFunc("/api/tasks/{id}/move", authMiddlewareCtx(server.moveTask)).Methods("PUT")
	r.HandleFunc("/ws/board/{id}", server.handleWebSocket)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(r)))
}
