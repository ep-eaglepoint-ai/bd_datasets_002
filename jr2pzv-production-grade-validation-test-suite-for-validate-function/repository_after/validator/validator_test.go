package validator

import (
	"errors"
	"testing"
	"time"
)

type fakeClock struct {
	now time.Time
}

func (fc fakeClock) Now() time.Time {
	return fc.now
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		mode    Mode
		policy  Policy
		clock   Clock
		wantErr error
	}{
		{
			name:    "empty_string_strict_min_length_1",
			input:   "",
			mode:    Strict,
			policy:  Policy{MinLength: 1},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "empty_string_lenient_min_length_1",
			input:   "",
			mode:    Lenient,
			policy:  Policy{MinLength: 1},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "whitespace_only_strict_min_length_1",
			input:   "   ",
			mode:    Strict,
			policy:  Policy{MinLength: 1},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "whitespace_only_lenient_min_length_1",
			input:   "   ",
			mode:    Lenient,
			policy:  Policy{MinLength: 1},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "whitespace_only_with_normalize_strict_min_length_1",
			input:   "   ",
			mode:    Strict,
			policy:  Policy{MinLength: 1, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "whitespace_only_with_normalize_lenient_min_length_1",
			input:   "   ",
			mode:    Lenient,
			policy:  Policy{MinLength: 1, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "exactly_min_length_strict",
			input:   "abc",
			mode:    Strict,
			policy:  Policy{MinLength: 3},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "exactly_min_length_lenient",
			input:   "abc",
			mode:    Lenient,
			policy:  Policy{MinLength: 3},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "just_below_min_length_strict",
			input:   "ab",
			mode:    Strict,
			policy:  Policy{MinLength: 3},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "just_below_min_length_lenient",
			input:   "ab",
			mode:    Lenient,
			policy:  Policy{MinLength: 3},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "just_above_min_length_strict",
			input:   "abcd",
			mode:    Strict,
			policy:  Policy{MinLength: 3},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "just_above_min_length_lenient",
			input:   "abcd",
			mode:    Lenient,
			policy:  Policy{MinLength: 3},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "outside_business_hours_before_9am",
			input:   "valid",
			mode:    Strict,
			policy:  Policy{MinLength: 1, BusinessHoursOnly: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 8, 59, 0, 0, time.UTC)},
			wantErr: ErrOutsideHours,
		},
		{
			name:    "outside_business_hours_after_5pm",
			input:   "valid",
			mode:    Strict,
			policy:  Policy{MinLength: 1, BusinessHoursOnly: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 17, 0, 0, 0, time.UTC)},
			wantErr: ErrOutsideHours,
		},
		{
			name:    "exactly_at_9am_business_hours",
			input:   "valid",
			mode:    Strict,
			policy:  Policy{MinLength: 1, BusinessHoursOnly: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 9, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "exactly_at_1659_business_hours",
			input:   "valid",
			mode:    Strict,
			policy:  Policy{MinLength: 1, BusinessHoursOnly: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 16, 59, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "sql_injection_detected_strict",
			input:   "DROP table",
			mode:    Strict,
			policy:  Policy{MinLength: 1, RejectSQL: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "sql_injection_detected_lenient",
			input:   "DROP table",
			mode:    Lenient,
			policy:  Policy{MinLength: 1, RejectSQL: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "xss_detected_strict",
			input:   "<SCRIPT>alert('xss')</SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 1, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrXSS,
		},
		{
			name:    "xss_detected_lenient",
			input:   "<SCRIPT>alert('xss')</SCRIPT>",
			mode:    Lenient,
			policy:  Policy{MinLength: 1, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrXSS,
		},
		{
			name:    "html_allowed",
			input:   "<SCRIPT>alert('xss')</SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 1, AllowHTML: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "fail_fast_short_input",
			input:   "ab",
			mode:    Strict,
			policy:  Policy{MinLength: 3, FailFast: true, RejectSQL: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "fail_fast_sql_injection",
			input:   "DROP table",
			mode:    Strict,
			policy:  Policy{MinLength: 1, FailFast: true, RejectSQL: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "fail_fast_multiple_violations",
			input:   "DROP",
			mode:    Strict,
			policy:  Policy{MinLength: 10, RejectSQL: true, AllowHTML: false, FailFast: true, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "multiple_errors_precedence_short_then_sql",
			input:   "DROP",
			mode:    Strict,
			policy:  Policy{MinLength: 10, RejectSQL: true, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "multiple_errors_precedence_sql_then_xss",
			input:   "DROP <SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 1, RejectSQL: true, AllowHTML: false, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "business_hours_with_other_violations_precedence",
			input:   "DROP",
			mode:    Strict,
			policy:  Policy{MinLength: 10, RejectSQL: true, BusinessHoursOnly: true, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 8, 0, 0, 0, time.UTC)},
			wantErr: ErrOutsideHours,
		},
		{
			name:    "business_hours_pass_with_other_violations",
			input:   "DROP",
			mode:    Strict,
			policy:  Policy{MinLength: 10, RejectSQL: true, BusinessHoursOnly: true, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "deterministic_error_precedence_consistency_test_1",
			input:   "DROP <S",
			mode:    Strict,
			policy:  Policy{MinLength: 20, RejectSQL: true, AllowHTML: false, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "deterministic_error_precedence_consistency_test_2",
			input:   "DROP <S",
			mode:    Strict,
			policy:  Policy{MinLength: 20, RejectSQL: true, AllowHTML: false, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "deterministic_error_precedence_consistency_test_3",
			input:   "DROP <S",
			mode:    Strict,
			policy:  Policy{MinLength: 20, RejectSQL: true, AllowHTML: false, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "fail_fast_earliest_validation_error",
			input:   "DROP",
			mode:    Strict,
			policy:  Policy{MinLength: 10, RejectSQL: true, FailFast: true, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "lenient_mode_suppresses_only_short_input",
			input:   "ab",
			mode:    Lenient,
			policy:  Policy{MinLength: 3},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "lenient_mode_does_not_suppress_sql_error",
			input:   "DROP",
			mode:    Lenient,
			policy:  Policy{MinLength: 1, RejectSQL: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "lenient_mode_does_not_suppress_multiple_violations",
			input:   "DROP",
			mode:    Lenient,
			policy:  Policy{MinLength: 10, RejectSQL: true, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "lenient_mode_does_not_suppress_xss_error",
			input:   "<SCRIPT>",
			mode:    Lenient,
			policy:  Policy{MinLength: 3, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrXSS,
		},
		{
			name:    "normalization_triggers_sql_detection",
			input:   "drop",
			mode:    Strict,
			policy:  Policy{MinLength: 1, RejectSQL: true, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "normalization_triggers_xss_detection",
			input:   "<script>",
			mode:    Strict,
			policy:  Policy{MinLength: 1, AllowHTML: false, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrXSS,
		},
		{
			name:    "nil_clock_uses_real_clock",
			input:   "valid",
			mode:    Strict,
			policy:  Policy{MinLength: 1},
			clock:   nil,
			wantErr: nil,
		},
		{
			name:    "nil_clock_uses_real_clock_with_sql_injection",
			input:   "DROP table",
			mode:    Strict,
			policy:  Policy{MinLength: 1, RejectSQL: true},
			clock:   nil,
			wantErr: ErrSQLInjection,
		},
		{
			name:    "nil_clock_uses_real_clock_with_xss",
			input:   "<SCRIPT>alert('xss')</SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 1, AllowHTML: false},
			clock:   nil,
			wantErr: ErrXSS,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Validate(tt.input, tt.mode, tt.policy, tt.clock)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
				}
			} else {
				if err != nil {
					t.Errorf("Validate() error = %v, wantErr nil", err)
				}
			}
		})
	}
}
