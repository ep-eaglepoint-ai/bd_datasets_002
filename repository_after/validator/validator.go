package validator

import (
	"errors"
	"strings"
	"time"
)

type Mode int

const (
	Lenient Mode = iota
	Strict
)

type Policy struct {
	MinLength         int
	AllowHTML         bool
	RejectSQL         bool
	NormalizeInput    bool
	FailFast          bool
	BusinessHoursOnly bool
}

type Clock interface {
	Now() time.Time
}

var (
	ErrTooShort      = errors.New("input too short")
	ErrSQLInjection  = errors.New("sql injection detected")
	ErrXSS            = errors.New("xss detected")
	ErrOutsideHours   = errors.New("outside business hours")
)

func Validate(input string, mode Mode, policy Policy, clock Clock) error {
	if clock == nil {
		clock = &realClock{}
	}

	// Check business hours first (highest precedence)
	if policy.BusinessHoursOnly {
		now := clock.Now()
		hour := now.Hour()
		if hour < 9 || hour >= 17 {
			return ErrOutsideHours
		}
	}

	// Apply normalization if requested
	processed := input
	if policy.NormalizeInput {
		processed = strings.TrimSpace(processed)
		processed = strings.ToUpper(processed)
	}

	// Check SQL injection
	if policy.RejectSQL {
		upperInput := strings.ToUpper(processed)
		if strings.Contains(upperInput, "DROP") || strings.Contains(upperInput, "DELETE") || 
		   strings.Contains(upperInput, "INSERT") || strings.Contains(upperInput, "UPDATE") {
			return ErrSQLInjection
		}
	}

	// Check XSS
	if !policy.AllowHTML {
		if strings.Contains(strings.ToUpper(processed), "<SCRIPT>") {
			return ErrXSS
		}
	}

	// Check minimum length
	if len(processed) < policy.MinLength {
		if mode == Strict {
			return ErrTooShort
		}
		// Lenient mode suppresses short input errors
		return nil
	}

	return nil
}

type realClock struct{}

func (rc *realClock) Now() time.Time {
	return time.Now()
}
