package http

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/ep-eaglepoint-ai/crm-engine/domain"
	"github.com/ep-eaglepoint-ai/crm-engine/usecase"
	"github.com/gorilla/mux"
)

// LeadHandler handles HTTP requests for lead management
type LeadHandler struct {
	useCase *usecase.LeadUseCase
}

// NewLeadHandler creates a new lead handler
func NewLeadHandler(useCase *usecase.LeadUseCase) *LeadHandler {
	return &LeadHandler{useCase: useCase}
}

// GetAllLeads handles GET /api/leads
func (h *LeadHandler) GetAllLeads(w http.ResponseWriter, r *http.Request) {
	leads, err := h.useCase.GetAllLeads()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leads)
}

// GetLead handles GET /api/leads/{id}
func (h *LeadHandler) GetLead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid lead ID", http.StatusBadRequest)
		return
	}

	lead, err := h.useCase.GetLead(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lead)
}

// SearchLeads handles GET /api/leads/search?q=query
func (h *LeadHandler) SearchLeads(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		h.GetAllLeads(w, r)
		return
	}

	leads, err := h.useCase.SearchLeads(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leads)
}

// CreateLead handles POST /api/leads
func (h *LeadHandler) CreateLead(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name      string `json:"name"`
		Email     string `json:"email"`
		LeadScore int    `json:"lead_score"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	lead, err := h.useCase.CreateLead(req.Name, req.Email, req.LeadScore)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(lead)
}

// UpdateLead handles PUT /api/leads/{id}
func (h *LeadHandler) UpdateLead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid lead ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Name      string            `json:"name"`
		Email     string            `json:"email"`
		LeadScore int               `json:"lead_score"`
		Status    domain.LeadStatus `json:"status"`
		Version   int64             `json:"version"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	lead, err := h.useCase.UpdateLead(id, req.Name, req.Email, req.LeadScore, req.Status, req.Version)
	if err != nil {
		// Handle specific error types
		if err == domain.ErrVersionMismatch {
			// Return 409 Conflict with fresh data
			freshLead, fetchErr := h.useCase.GetLead(id)
			if fetchErr != nil {
				http.Error(w, err.Error(), http.StatusConflict)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":      "Concurrent modification detected",
				"fresh_data": freshLead,
			})
			return
		}
		if err == domain.ErrInsufficientScore {
			// Return 422 Unprocessable Entity
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnprocessableEntity)
			json.NewEncoder(w).Encode(map[string]string{
				"error": err.Error(),
			})
			return
		}
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lead)
}

// DeleteLead handles DELETE /api/leads/{id}
func (h *LeadHandler) DeleteLead(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid lead ID", http.StatusBadRequest)
		return
	}

	if err := h.useCase.DeleteLead(id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// RenderLeadRow renders a single lead row as HTML fragment for HTMX
func (h *LeadHandler) RenderLeadRow(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid lead ID", http.StatusBadRequest)
		return
	}

	lead, err := h.useCase.GetLead(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	fmt.Fprintf(w, `<tr id="lead-%d" hx-swap-oob="true">`, lead.ID)
	fmt.Fprintf(w, `<td>%d</td>`, lead.ID)
	fmt.Fprintf(w, `<td>%s</td>`, lead.Name)
	fmt.Fprintf(w, `<td>%s</td>`, lead.Email)
	fmt.Fprintf(w, `<td>%d</td>`, lead.LeadScore)
	fmt.Fprintf(w, `<td><span class="status-%s">%s</span></td>`, strings.ToLower(string(lead.Status)), lead.Status)
	fmt.Fprintf(w, `<td>%d</td>`, lead.Version)
	fmt.Fprintf(w, `<td><button hx-get="/lead/%d/edit" hx-target="#edit-form">Edit</button></td>`, lead.ID)
	fmt.Fprintf(w, `</tr>`)
}

// RegisterRoutes registers all routes for the lead handler
func (h *LeadHandler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/api/leads", h.GetAllLeads).Methods("GET")
	router.HandleFunc("/api/leads", h.CreateLead).Methods("POST")
	router.HandleFunc("/api/leads/search", h.SearchLeads).Methods("GET")
	router.HandleFunc("/api/leads/{id}", h.GetLead).Methods("GET")
	router.HandleFunc("/api/leads/{id}", h.UpdateLead).Methods("PUT")
	router.HandleFunc("/api/leads/{id}", h.DeleteLead).Methods("DELETE")
	router.HandleFunc("/lead/{id}/row", h.RenderLeadRow).Methods("GET")
}

// HealthCheck handles GET /health
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

// LoggingMiddleware logs incoming HTTP requests
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s %s", r.RemoteAddr, r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

// CORSMiddleware adds CORS headers
func CORSMiddleware(next http.Handler) http.Handler {
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
