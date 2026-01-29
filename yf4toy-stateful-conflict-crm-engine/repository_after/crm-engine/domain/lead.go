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
func (l *Lead) CanTransitionTo(newStatus LeadStatus) error {
	// Check conversion requirement
	if newStatus == StatusConverted && l.LeadScore < MinScoreForConversion {
		return ErrInsufficientScore
	}
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
