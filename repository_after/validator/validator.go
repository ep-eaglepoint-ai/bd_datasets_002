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

	var errs []error

	// Check minimum length
	if len(processed) < policy.MinLength {
		if policy.FailFast {
			return ErrTooShort
		}
		errs = append(errs, ErrTooShort)
	}

	// Check SQL injection
	if policy.RejectSQL {
		if strings.Contains(processed, "DROP") || strings.Contains(processed, "DELETE") || 
		   strings.Contains(processed, "INSERT") || strings.Contains(processed, "UPDATE") {
			if policy.FailFast {
				return ErrSQLInjection
			}
			errs = append(errs, ErrSQLInjection)
		}
	}

	// Check XSS
	if !policy.AllowHTML {
		if strings.Contains(strings.ToUpper(processed), "<SCRIPT>") {
			if policy.FailFast {
				return ErrXSS
			}
			errs = append(errs, ErrXSS)
		}
	}

	// Lenient mode suppresses exactly one short-input violation and no other
	if mode == Lenient && len(errs) == 1 && errors.Is(errs[0], ErrTooShort) {
		return nil
	}

	// Return first error for deterministic precedence
	if len(errs) > 0 {
		return errs[0]
	}

	return nil
}

type realClock struct{}

func (rc *realClock) Now() time.Time {
	return time.Now()
}
