package claimsdeduplication

import (
	"log"
	"time"
)

// DeduplicationResult represents the outcome of deduplication process
type DeduplicationResult struct {
	KeptClaims    []*Claim
	DiscardedClaims []*Claim
	Decisions     []DeduplicationDecision
}

// DeduplicationDecision records each deduplication decision for logging
type DeduplicationDecision struct {
	Timestamp           time.Time
	CompositeKey        string
	KeptClaimId         string
	DiscardedClaimId    string
	ResolutionReason    string
	KeptSubmissionDate  time.Time
	DiscardedSubmissionDate time.Time
}

// ClaimsDeduplicator handles the deduplication logic
type ClaimsDeduplicator struct {
	seenClaims map[string]*Claim
	decisions  []DeduplicationDecision
	logger     *log.Logger
}

// NewClaimsDeduplicator creates a new deduplicator instance
func NewClaimsDeduplicator(logger *log.Logger) *ClaimsDeduplicator {
	return &ClaimsDeduplicator{
		seenClaims: make(map[string]*Claim),
		decisions:  make([]DeduplicationDecision, 0),
		logger:     logger,
	}
}

// DeduplicateClaims performs deduplication on a list of claims
func (d *ClaimsDeduplicator) DeduplicateClaims(claims []*Claim) *DeduplicationResult {
	result := &DeduplicationResult{
		KeptClaims:      make([]*Claim, 0),
		DiscardedClaims: make([]*Claim, 0),
		Decisions:       make([]DeduplicationDecision, 0),
	}
	
	for _, claim := range claims {
		if !claim.IsValidKey() {
			// Handle claims with invalid composite keys - keep them but log
			result.KeptClaims = append(result.KeptClaims, claim)
			d.logger.Printf("Warning: Claim %s has invalid composite key, keeping without deduplication", claim.ClaimId)
			continue
		}
		
		compositeKey := claim.CompositeKey()
		
		if existingClaim, exists := d.seenClaims[compositeKey]; exists {
			// Duplicate found - determine which to keep
			if claim.ShouldReplace(existingClaim) {
				// New claim should replace existing one
				d.recordDecision(compositeKey, claim, existingClaim, "newer_submission_date")
				
				// Find and remove the existing claim from kept claims
				for i, keptClaim := range result.KeptClaims {
					if keptClaim.CompositeKey() == compositeKey {
						result.KeptClaims = append(result.KeptClaims[:i], result.KeptClaims[i+1:]...)
						result.DiscardedClaims = append(result.DiscardedClaims, keptClaim)
						break
					}
				}
				
				// Update the stored claim and add to kept list
				d.seenClaims[compositeKey] = claim
				result.KeptClaims = append(result.KeptClaims, claim)
			} else {
				// Keep existing claim, discard new one
				d.recordDecision(compositeKey, existingClaim, claim, "first_encountered")
				result.DiscardedClaims = append(result.DiscardedClaims, claim)
			}
		} else {
			// First time seeing this composite key
			d.seenClaims[compositeKey] = claim
			result.KeptClaims = append(result.KeptClaims, claim)
		}
	}
	
	result.Decisions = d.decisions
	return result
}

// recordDecision logs a deduplication decision
func (d *ClaimsDeduplicator) recordDecision(compositeKey string, keptClaim, discardedClaim *Claim, reason string) {
	decision := DeduplicationDecision{
		Timestamp:                 time.Now(),
		CompositeKey:              compositeKey,
		KeptClaimId:              keptClaim.ClaimId,
		DiscardedClaimId:         discardedClaim.ClaimId,
		ResolutionReason:         reason,
		KeptSubmissionDate:       keptClaim.ClaimSubmissionDate,
		DiscardedSubmissionDate:  discardedClaim.ClaimSubmissionDate,
	}
	
	d.decisions = append(d.decisions, decision)
	
	// Log the decision
	d.logger.Printf("Deduplication Decision: Key=%s, Kept=%s (Date: %s), Discarded=%s (Date: %s), Reason=%s",
		compositeKey,
		keptClaim.ClaimId,
		keptClaim.ClaimSubmissionDate.Format("2006-01-02"),
		discardedClaim.ClaimId,
		discardedClaim.ClaimSubmissionDate.Format("2006-01-02"),
		reason)
}

// GetDecisionCount returns the number of deduplication decisions made
func (d *ClaimsDeduplicator) GetDecisionCount() int {
	return len(d.decisions)
}

// GetUniqueClaimCount returns the number of unique composite keys seen
func (d *ClaimsDeduplicator) GetUniqueClaimCount() int {
	return len(d.seenClaims)
}

// Reset clears the deduplicator state for reuse
func (d *ClaimsDeduplicator) Reset() {
	d.seenClaims = make(map[string]*Claim)
	d.decisions = make([]DeduplicationDecision, 0)
}
