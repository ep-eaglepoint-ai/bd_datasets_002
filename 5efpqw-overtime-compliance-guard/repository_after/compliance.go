package compliance

import (
	"errors"
	"fmt"
	"time"
)

// ErrStatusPolicyViolation is returned when the assignment violates the 40-hour rolling window policy.
var ErrStatusPolicyViolation = errors.New("StatusPolicyViolation")

// ErrRestIntervalViolation is returned when the rest interval is insufficient.
var ErrRestIntervalViolation = errors.New("rest interval violation")

// ErrOverlap is returned when the assignment overlaps with an existing shift.
var ErrOverlap = errors.New("overlap detected")

// Assignment represents a work shift.
type Assignment struct {
	EmployeeID string
	Start      time.Time
	End        time.Time
}

// ValidateAssignment checks if the proposed assignment complies with hospital policies.
// Policies enforced:
// 1. Rolling Window Validation: Total hours in the trailing 7 days (ending at proposed.End) must not exceed 40.
// 2. Rest-Interval Verification: At least 8 hours gap after the most recent prior shift.
// 3. Overlapping Protection: No temporal overlap with existing shifts for the same employee.
func ValidateAssignment(existingSchedule []Assignment, proposed Assignment) error {
	if proposed.End.Before(proposed.Start) || proposed.End.Equal(proposed.Start) {
		return errors.New("invalid shift duration")
	}

	const (
		RollingWindowDuration = 168 * time.Hour
		MaxHours              = 40.0
		RestInterval          = 8 * time.Hour
	)

	// Rolling window is [windowStart, proposed.End]
	windowEnd := proposed.End
	windowStart := windowEnd.Add(-RollingWindowDuration)

	var totalDuration time.Duration
	var lastPriorEnd time.Time
	var hasPrior bool

	// Optimization: Since we need to iterate for overlap and window sum, we do it in one pass.
	// For "most recent prior shift", we track the max End time of shifts ending <= proposed.Start.

	for _, shift := range existingSchedule {
		if shift.EmployeeID != proposed.EmployeeID {
			continue
		}

		// 3. Overlapping Protection
		// Overlap occurs if one starts before the other ends.
		// (StartA < EndB) and (StartB < EndA)
		if proposed.Start.Before(shift.End) && shift.Start.Before(proposed.End) {
			return ErrOverlap
		}

		// 2. Rest-Interval Verification Helper
		// Identify if this shift is strictly before the proposed Start
		if !shift.End.After(proposed.Start) {
			if !hasPrior || shift.End.After(lastPriorEnd) {
				lastPriorEnd = shift.End
				hasPrior = true
			}
		}

		// 1. Rolling Window Validation Helper
		// Calculate intersection of this shift with the window [windowStart, windowEnd]
		// Shift interval: [shift.Start, shift.End]
		// Intersection: [max(shift.Start, windowStart), min(shift.End, windowEnd)]

		iStart := shift.Start
		if iStart.Before(windowStart) {
			iStart = windowStart
		}

		iEnd := shift.End
		if iEnd.After(windowEnd) {
			iEnd = windowEnd
		}

		// Only add if there is a positive intersection
		if iEnd.After(iStart) {
			totalDuration += iEnd.Sub(iStart)
		}
	}

	// Check Rest Interval
	if hasPrior {
		gap := proposed.Start.Sub(lastPriorEnd)
		if gap < RestInterval {
			return fmt.Errorf("%w: gap is %v, required %v", ErrRestIntervalViolation, gap, RestInterval)
		}
	}

	// Add proposed shift contribution to window
	// Proposed shift is [proposed.Start, proposed.End]
	// Window is [windowStart, proposed.End]
	// Intersection logic:
	pStart := proposed.Start
	if pStart.Before(windowStart) {
		pStart = windowStart
	}
	pEnd := proposed.End // same as windowEnd

	if pEnd.After(pStart) {
		totalDuration += pEnd.Sub(pStart)
	}

	if totalDuration.Hours() > MaxHours {
		// Prompt requires a specific error message about the 40-hour limit and returning StatusPolicyViolation
		return fmt.Errorf("%w: total hours %.2f exceeds 40 hours limit", ErrStatusPolicyViolation, totalDuration.Hours())
	}

	return nil
}
