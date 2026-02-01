package domain

import (
	"errors"
	"time"
)

// LeadStatus represents the status of a lead
type LeadStatus string

const (
	StatusProspect  LeadStatus = "PROSPECT"
	StatusQualified LeadStatus = "QUALIFIED"
	StatusConverted LeadStatus = "CONVERTED"
)

// MinScoreForConversion is the minimum lead score required for conversion
const MinScoreForConversion = 80

// Lead represents a customer lead entity
type Lead struct {
	ID        int        `json:"id"`
	Name      string     `json:"name"`
	Email     string     `json:"email"`
	LeadScore int        `json:"lead_score"`
	Status    LeadStatus `json:"status"`
	Version   int64      `json:"version"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// Validation errors
var (
	ErrInvalidName       = errors.New("name cannot be empty")
	ErrInvalidEmail      = errors.New("email cannot be empty")
	ErrInvalidScore      = errors.New("lead score must be between 0 and 100")
	ErrInvalidStatus     = errors.New("invalid status value")
	ErrVersionMismatch   = errors.New("version mismatch: concurrent modification detected")
	ErrInsufficientScore = errors.New("lead score must be at least 80 to convert")
	ErrInvalidTransition = errors.New("invalid status transition")
	ErrLeadNotFound      = errors.New("lead not found")
)

// Validate checks if the lead data is valid
func (l *Lead) Validate() error {
	if l.Name == "" {
		return ErrInvalidName
	}
	if l.Email == "" {
		return ErrInvalidEmail
	}
	if l.LeadScore < 0 || l.LeadScore > 100 {
		return ErrInvalidScore
	}
	if l.Status != StatusProspect && l.Status != StatusQualified && l.Status != StatusConverted {
		return ErrInvalidStatus
	}
	return nil
}

// CanTransitionTo checks if a lead can transition to a new status
func (l *Lead) CanTransitionTo(newStatus LeadStatus, newScore int) error {
	// 1. Cannot transition to self (handled by caller, but safe to ignore or return nil)
	if l.Status == newStatus {
		return nil
	}

	// 2. CONVERTED is terminal state
	if l.Status == StatusConverted {
		return ErrInvalidTransition
	}

	// 3. Check conversion requirement - use the NEW score
	if newStatus == StatusConverted {
		if newScore < MinScoreForConversion {
			return ErrInsufficientScore
		}
	}

	// 4. Validate specific transitions (CONVERTED is terminal, others allowed)
	return nil
}

// LeadRepository defines the interface for lead data access
type LeadRepository interface {
	Create(lead *Lead) error
	FindByID(id int) (*Lead, error)
	FindAll() ([]*Lead, error)
	Search(query string) ([]*Lead, error)
	Update(lead *Lead, expectedVersion int64) error
	Delete(id int) error
}
