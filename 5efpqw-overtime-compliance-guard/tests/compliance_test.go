package tests

import (
	"errors"
	"strings"
	"testing"
	"time"

	compliance "overtime/repository_after"
)

func TestValidateAssignment(t *testing.T) {
	// Base time for stability
	refTime := time.Date(2023, 10, 1, 12, 0, 0, 0, time.UTC)

	t.Run("Valid Assignment Simple", func(t *testing.T) {
		schedule := []compliance.Assignment{}
		proposed := compliance.Assignment{
			EmployeeID: "E1",
			Start:      refTime,
			End:        refTime.Add(4 * time.Hour),
		}
		if err := compliance.ValidateAssignment(schedule, proposed); err != nil {
			t.Errorf("expected nil, got %v", err)
		}
	})

	t.Run("40-Hour Limit Violation", func(t *testing.T) {

		propStart := refTime
		propEnd := refTime.Add(3 * time.Hour) // Duration 3h
		proposed := compliance.Assignment{
			EmployeeID: "E1",
			Start:      propStart,
			End:        propEnd,
		}

		existingStart := propStart.Add(-50 * time.Hour)
		existingEnd := existingStart.Add(38 * time.Hour)

		schedule := []compliance.Assignment{
			{
				EmployeeID: "E1",
				Start:      existingStart,
				End:        existingEnd,
			},
		}

		err := compliance.ValidateAssignment(schedule, proposed)
		if !errors.Is(err, compliance.ErrStatusPolicyViolation) {
			t.Errorf("expected error target %v, got %v", compliance.ErrStatusPolicyViolation, err)
		}
		if !strings.Contains(err.Error(), "40 hours") {
			t.Errorf("expected error message to mention 40 hours, got %v", err)
		}
	})

	t.Run("Rest Interval Violation", func(t *testing.T) {

		day := time.Date(2023, 10, 2, 0, 0, 0, 0, time.UTC)

		// Night shift: 22:00 to 06:00
		nightStart := day.Add(6 * time.Hour).Add(-8 * time.Hour)
		nightEnd := day.Add(6 * time.Hour) // 06:00

		// New shift: starts 12:00
		newStart := day.Add(12 * time.Hour)
		newEnd := newStart.Add(4 * time.Hour)

		schedule := []compliance.Assignment{
			{
				EmployeeID: "NurseJ",
				Start:      nightStart,
				End:        nightEnd,
			},
		}

		proposed := compliance.Assignment{
			EmployeeID: "NurseJ",
			Start:      newStart,
			End:        newEnd,
		}

		err := compliance.ValidateAssignment(schedule, proposed)
		if !errors.Is(err, compliance.ErrRestIntervalViolation) {
			t.Errorf("expected error target %v, got %v", compliance.ErrRestIntervalViolation, err)
		}
	})

	t.Run("Overlap Violation", func(t *testing.T) {
		startA := refTime
		endA := startA.Add(2 * time.Hour) // 12:00

		startB := refTime.Add(1*time.Hour + 59*time.Minute) // 11:59
		endB := startB.Add(2 * time.Hour)

		schedule := []compliance.Assignment{
			{EmployeeID: "E1", Start: startA, End: endA},
		}
		proposed := compliance.Assignment{EmployeeID: "E1", Start: startB, End: endB}

		err := compliance.ValidateAssignment(schedule, proposed)
		if !errors.Is(err, compliance.ErrOverlap) {
			t.Errorf("expected overlap error, got %v", err)
		}
	})

	t.Run("Ignore Other Employees", func(t *testing.T) {
		schedule := []compliance.Assignment{
			{EmployeeID: "Other", Start: refTime, End: refTime.Add(100 * time.Hour)},
		}
		proposed := compliance.Assignment{EmployeeID: "Me", Start: refTime, End: refTime.Add(1 * time.Hour)}

		if err := compliance.ValidateAssignment(schedule, proposed); err != nil {
			t.Errorf("should ignore other employees, got %v", err)
		}
	})

	t.Run("Rolling Window Partial Overlap", func(t *testing.T) {
		propEnd := refTime
		propStart := propEnd.Add(-33 * time.Hour)
		windowStart := propEnd.Add(-168 * time.Hour)

		existingEnd := windowStart.Add(8 * time.Hour)    // T - 160h
		existingStart := windowStart.Add(-2 * time.Hour) // T - 170h

		schedule := []compliance.Assignment{
			{EmployeeID: "E1", Start: existingStart, End: existingEnd},
		}
		proposed := compliance.Assignment{EmployeeID: "E1", Start: propStart, End: propEnd}

		err := compliance.ValidateAssignment(schedule, proposed)
		if !errors.Is(err, compliance.ErrStatusPolicyViolation) {
			t.Errorf("expected 40h violation for partial overlap, total should be 41, got %v", err)
		}
	})
}
