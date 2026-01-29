package usecase

import (
	"time"

	"github.com/ep-eaglepoint-ai/crm-engine/domain"
)

// LeadUseCase handles business logic for lead management
type LeadUseCase struct {
	repo domain.LeadRepository
}

// NewLeadUseCase creates a new lead use case
func NewLeadUseCase(repo domain.LeadRepository) *LeadUseCase {
	return &LeadUseCase{repo: repo}
}

// CreateLead creates a new lead
func (uc *LeadUseCase) CreateLead(name, email string, score int) (*domain.Lead, error) {
	lead := &domain.Lead{
		Name:      name,
		Email:     email,
		LeadScore: score,
		Status:    domain.StatusProspect,
		Version:   1,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := lead.Validate(); err != nil {
		return nil, err
	}

	if err := uc.repo.Create(lead); err != nil {
		return nil, err
	}

	return lead, nil
}

// GetLead retrieves a lead by ID
func (uc *LeadUseCase) GetLead(id int) (*domain.Lead, error) {
	return uc.repo.FindByID(id)
}

// GetAllLeads retrieves all leads
func (uc *LeadUseCase) GetAllLeads() ([]*domain.Lead, error) {
	return uc.repo.FindAll()
}

// SearchLeads searches for leads matching the query
func (uc *LeadUseCase) SearchLeads(query string) ([]*domain.Lead, error) {
	return uc.repo.Search(query)
}

// UpdateLead updates a lead with optimistic locking
func (uc *LeadUseCase) UpdateLead(id int, name, email string, score int, status domain.LeadStatus, version int64) (*domain.Lead, error) {
	// Get the current lead
	existingLead, err := uc.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Prepare updated lead
	updatedLead := &domain.Lead{
		ID:        id,
		Name:      name,
		Email:     email,
		LeadScore: score,
		Status:    status,
		Version:   version,
		CreatedAt: existingLead.CreatedAt,
		UpdatedAt: time.Now(),
	}

	// Validate the lead data
	if err := updatedLead.Validate(); err != nil {
		return nil, err
	}

	// Check if status transition is allowed
	if existingLead.Status != status {
		if err := updatedLead.CanTransitionTo(status); err != nil {
			return nil, err
		}
	}

	// Attempt update with version check (optimistic locking)
	if err := uc.repo.Update(updatedLead, version); err != nil {
		return nil, err
	}

	// Fetch the updated lead to get the new version
	return uc.repo.FindByID(id)
}

// DeleteLead deletes a lead by ID
func (uc *LeadUseCase) DeleteLead(id int) error {
	return uc.repo.Delete(id)
}
