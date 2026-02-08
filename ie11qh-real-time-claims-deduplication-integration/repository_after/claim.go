package claimsdeduplication

import (
	"time"
)

// Claim represents a healthcare claim with all necessary fields for deduplication
type Claim struct {
	ClaimId             string
	PatientId           string
	ServiceDateFrom     time.Time
	ClaimSubmissionDate time.Time
	TotalAmount         float64
	ServiceLines        []ServiceLine
	RawData             string // Original EDI segment data
	Position            int    // Original position in input for order preservation
}

// ServiceLine represents individual service lines within a claim
type ServiceLine struct {
	ProcedureCode string
	Amount        float64
	Units         string
}

// CompositeKey creates the unique key for deduplication: ClaimId + PatientId + ServiceDateFrom
func (c *Claim) CompositeKey() string {
	return c.ClaimId + "|" + c.PatientId + "|" + c.ServiceDateFrom.Format("2006-01-02")
}

// IsValidKey checks if the claim has valid composite key fields
func (c *Claim) IsValidKey() bool {
	return c.ClaimId != "" && c.PatientId != "" && !c.ServiceDateFrom.IsZero()
}

// ShouldReplace determines if this claim should replace an existing claim based on business rules
func (c *Claim) ShouldReplace(existing *Claim) bool {
	if c.ClaimSubmissionDate.After(existing.ClaimSubmissionDate) {
		return true
	}
	
	// If submission dates are identical, keep first encountered (existing)
	return false
}
