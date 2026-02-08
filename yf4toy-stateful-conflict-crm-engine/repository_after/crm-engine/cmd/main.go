package main

import (
	"html/template"
	"log"
	"net/http"
	"os"
	"time"

	httpdelivery "github.com/ep-eaglepoint-ai/crm-engine/delivery/http"
	"github.com/ep-eaglepoint-ai/crm-engine/domain"
	"github.com/ep-eaglepoint-ai/crm-engine/infrastructure/database"
	"github.com/ep-eaglepoint-ai/crm-engine/infrastructure/postgres"
	"github.com/ep-eaglepoint-ai/crm-engine/usecase"
	"github.com/gorilla/mux"
)

func main() {
	// Connect to database
	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize repository
	leadRepo := postgres.NewLeadRepository(db)
	if err := leadRepo.InitSchema(); err != nil {
		log.Fatalf("Failed to initialize schema: %v", err)
	}

	// Seed some initial data for testing
	seedData(leadRepo)

	// Initialize use case
	leadUseCase := usecase.NewLeadUseCase(leadRepo)

	// Initialize handler
	leadHandler := httpdelivery.NewLeadHandler(leadUseCase)

	// Setup router
	router := mux.NewRouter()

	// Serve static files
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))

	// Serve HTML template at root
	router.HandleFunc("/", serveIndex).Methods("GET")

	// Register API routes
	leadHandler.RegisterRoutes(router)
	router.HandleFunc("/health", httpdelivery.HealthCheck).Methods("GET")

	// Apply middleware
	router.Use(httpdelivery.LoggingMiddleware)
	router.Use(httpdelivery.CORSMiddleware)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("CRM Engine server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func seedData(repo *postgres.LeadRepositoryPostgres) {
	// Check if data already exists
	leads, _ := repo.FindAll()
	if len(leads) > 0 {
		log.Println("Database already seeded, skipping...")
		return
	}

	log.Println("Seeding initial data...")
	// Add some sample leads for testing
	sampleLeads := []struct {
		name  string
		email string
		score int
	}{
		{"John Doe", "john@example.com", 45},
		{"Jane Smith", "jane@example.com", 85},
		{"Bob Johnson", "bob@example.com", 60},
		{"Alice Williams", "alice@example.com", 90},
		{"Charlie Brown", "charlie@example.com", 30},
	}

	for _, sl := range sampleLeads {
		lead := &domain.Lead{
			Name:      sl.name,
			Email:     sl.email,
			LeadScore: sl.score,
			Status:    domain.StatusProspect,
			Version:   1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := repo.Create(lead); err != nil {
			log.Printf("Failed to seed lead %s: %v", sl.name, err)
		}
	}
	log.Println("Data seeding completed")
}

func serveIndex(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("./templates/index.html")
	if err != nil {
		log.Printf("Failed to parse template: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Pass backend URL to template (empty string means same origin)
	data := struct {
		BackendURL string
	}{
		BackendURL: "",
	}

	if err := tmpl.Execute(w, data); err != nil {
		log.Printf("Failed to execute template: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}
