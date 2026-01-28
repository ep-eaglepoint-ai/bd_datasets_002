package tests

import (
	// "fmt"
	"testing"
	// Ensure these paths match your module name in go.mod
	old "concat/repository_before/concat"
	optimized "concat/repository_after/concat"
)

// Requirement 1 & 7: Correctness Test
// Uses a guardrail to catch panics from the "Awful" implementation.
func TestCorrectness(t *testing.T) {
	input := []string{"Byte", "Dance", "Go", "Optimization"}
	expected := "ByteDanceGoOptimization"

	t.Run("Before_Legacy", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Expected failure: Legacy code panicked: %v", r)
			}
		}()
		if res := old.ConcatAwful(input); res != expected {
			t.Errorf("Legacy incorrect: got %q, want %q", res, expected)
		}
	})

	t.Run("After_Optimized", func(t *testing.T) {
		if res := optimized.Concat(input); res != expected {
			t.Errorf("Requirement 1 Failed: Optimized Concat returned %q, want %q", res, expected)
		}
	})
}

// Requirement 4 (Failure Gate): This command MUST fail.
// It catches the regex panic and converts it into a test failure.
func TestEfficiencyBefore(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("FAIL (Intentional): Before implementation is broken and panicked: %v", r)
		}
	}()

	input := make([]string, 50)
	for i := range input {
		input[i] = "test"
	}

	allocs := testing.AllocsPerRun(1, func() {
		_ = old.ConcatAwful(input)
	})

	if allocs > 1 {
		t.Errorf("Requirement 4 Failed: Baseline has %.0f allocations, want 1", allocs)
	}
}

// Requirement 4 (Success Gate): This command MUST pass.
func TestEfficiencyAfter(t *testing.T) {
	input := make([]string, 50)
	for i := range input {
		input[i] = "test"
	}

	// This should not panic and should result in exactly 1 allocation.
	allocs := testing.AllocsPerRun(1, func() {
		_ = optimized.Concat(input)
	})

	if allocs > 1 {
		t.Errorf("Requirement 4 Failed: Optimized version has %.0f allocations, want 1. Check builder.Grow().", allocs)
	}
}

// --- Benchmarks for Performance Reporting ---

func BenchmarkConcatBefore(b *testing.B) {
	// Benchmarks that panic will stop execution; we recover inside the loop
	// to allow the benchmark to at least register a failure/result.
	input := make([]string, 10)
	for i := 0; i < b.N; i++ {
		func() {
			defer func() { recover() }()
			_ = old.ConcatAwful(input)
		}()
	}
}

func BenchmarkConcatAfter(b *testing.B) {
	input := make([]string, 100)
	for i := range input {
		input[i] = "benchmark-data"
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = optimized.Concat(input)
	}
}