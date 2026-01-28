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
			input:   "ab DROP <SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 3, RejectSQL: true, AllowHTML: false, FailFast: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "multiple_errors_precedence_short_then_sql",
			input:   "ab DROP",
			mode:    Strict,
			policy:  Policy{MinLength: 3, RejectSQL: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "multiple_errors_precedence_sql_then_xss",
			input:   "DROP <SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 1, RejectSQL: true, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "multiple_errors_precedence_xss_only",
			input:   "<SCRIPT>valid</SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 1, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrXSS,
		},
		{
			name:    "lenient_multiple_errors_short_and_sql",
			input:   "ab DROP",
			mode:    Lenient,
			policy:  Policy{MinLength: 3, RejectSQL: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "lenient_multiple_errors_sql_and_xss",
			input:   "DROP <SCRIPT>",
			mode:    Lenient,
			policy:  Policy{MinLength: 1, RejectSQL: true, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "lenient_multiple_errors_short_and_xss",
			input:   "ab <SCRIPT>",
			mode:    Lenient,
			policy:  Policy{MinLength: 3, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrXSS,
		},
		{
			name:    "lenient_multiple_errors_short_and_sql_and_xss",
			input:   "ab DROP <SCRIPT>",
			mode:    Lenient,
			policy:  Policy{MinLength: 3, RejectSQL: true, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "strict_never_returns_nil_with_violations_short",
			input:   "ab",
			mode:    Strict,
			policy:  Policy{MinLength: 3},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "strict_never_returns_nil_with_violations_sql",
			input:   "DROP",
			mode:    Strict,
			policy:  Policy{MinLength: 1, RejectSQL: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "strict_never_returns_nil_with_violations_xss",
			input:   "<SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 1, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrXSS,
		},
		{
			name:    "normalization_trimming_changes_outcome",
			input:   "  abc  ",
			mode:    Strict,
			policy:  Policy{MinLength: 5, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrTooShort,
		},
		{
			name:    "normalization_trimming_passes",
			input:   "  abcde  ",
			mode:    Strict,
			policy:  Policy{MinLength: 5, NormalizeInput: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: nil,
		},
		{
			name:    "business_hours_with_other_violations_precedence",
			input:   "ab DROP",
			mode:    Strict,
			policy:  Policy{MinLength: 3, RejectSQL: true, BusinessHoursOnly: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 8, 0, 0, 0, time.UTC)},
			wantErr: ErrOutsideHours,
		},
		{
			name:    "business_hours_pass_with_other_violations",
			input:   "ab DROP",
			mode:    Strict,
			policy:  Policy{MinLength: 3, RejectSQL: true, BusinessHoursOnly: true},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "deterministic_error_precedence_consistency_test_1",
			input:   "ab DROP <SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 3, RejectSQL: true, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "deterministic_error_precedence_consistency_test_2",
			input:   "ab DROP <SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 3, RejectSQL: true, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
		},
		{
			name:    "deterministic_error_precedence_consistency_test_3",
			input:   "ab DROP <SCRIPT>",
			mode:    Strict,
			policy:  Policy{MinLength: 3, RejectSQL: true, AllowHTML: false},
			clock:   fakeClock{now: time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)},
			wantErr: ErrSQLInjection,
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