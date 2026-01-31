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

type RealClock struct{}

func (RealClock) Now() time.Time {
	return time.Now()
}
 
var (
	ErrTooShort     = errors.New("input too short")
	ErrSQLInjection = errors.New("sql injection detected")
	ErrXSS          = errors.New("xss detected")
	ErrOutsideHours = errors.New("outside business hours")
)

func Validate(
	input string,
	mode Mode,
	policy Policy,
	clock Clock,
) error {
	if clock == nil {
		clock = RealClock{}
	}

	if policy.BusinessHoursOnly {
		hour := clock.Now().Hour()
		if hour < 9 || hour >= 17 {
			return ErrOutsideHours
		}
	}

	if policy.NormalizeInput {
		input = strings.TrimSpace(input)
		input = strings.ToUpper(input)
	}

	var errs []error

	if len(input) < policy.MinLength {
		if policy.FailFast {
			return ErrTooShort
		}
		errs = append(errs, ErrTooShort)
	}

	if policy.RejectSQL && strings.Contains(input, "DROP") {
		if policy.FailFast {
			return ErrSQLInjection
		}
		errs = append(errs, ErrSQLInjection)
	}

	if !policy.AllowHTML && strings.Contains(input, "<SCRIPT>") {
		if policy.FailFast {
			return ErrXSS
		}
		errs = append(errs, ErrXSS)
	}

	if mode == Lenient && len(errs) == 1 && errors.Is(errs[0], ErrTooShort) {
		return nil
	}

	if len(errs) > 0 {
		return errs[0]
	}

	return nil
}
 