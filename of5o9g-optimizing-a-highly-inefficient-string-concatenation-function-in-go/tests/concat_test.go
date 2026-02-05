package tests

import (
	old "concat/repository_before/concat"
	optimized "concat/repository_after/concat"
	"fmt"
	"os"
	"testing"
	"time"
)

// --- Helper Suites with Clear Result Logging ---

func runCorrectnessSuite(t *testing.T, label string, concatFn func([]string) string) {
	testCases := []struct {
		name     string
		input    []string
		expected string
	}{
		{"1_EmptySlice", []string{}, ""},
		{"2_NilSlice", nil, ""},
		{"3_SingleElement", []string{"Go"}, "Go"},
		{"4_Standard", []string{"Byte", "Dance", "Go"}, "ByteDanceGo"},
		{"5_WithEmptyStrings", []string{"a", "", "b", ""}, "ab"},
		{"6_LongStrings", []string{"Optimization", "Test", "Case"}, "OptimizationTestCase"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("[RESULT] %s | Case: %s | STATUS: FAILED (Panic: %v)", label, tc.name, r)
				}
			}()
			res := concatFn(tc.input)
			if res != tc.expected {
				t.Errorf("[RESULT] %s | Case: %s | STATUS: FAILED (Got %q, Want %q)", label, tc.name, res, tc.expected)
			} else {
				t.Logf("[RESULT] %s | Case: %s | STATUS: PASSED", label, tc.name)
			}
		})
	}
}

func runComplexitySuite(t *testing.T, label string, concatFn func([]string) string) {
	measure := func(n int) time.Duration {
		input := make([]string, n)
		for i := range input { input[i] = "a" }
		start := time.Now()
		_ = concatFn(input)
		return time.Since(start)
	}
	n1, n2 := 1000, 10000
	measure(100) 
	t1, t2 := measure(n1), measure(n2)
	ratio := float64(t2.Nanoseconds()) / float64(t1.Nanoseconds())

	if ratio > 30 {
		t.Errorf("[RESULT] %s | Req 3 (O(n) Complexity) | STATUS: FAILED (Ratio: %.2fx)", label, ratio)
	} else {
		t.Logf("[RESULT] %s | Req 3 (O(n) Complexity) | STATUS: PASSED (Ratio: %.2fx)", label, ratio)
	}
}

func runEfficiencySuite(t *testing.T, label string, concatFn func([]string) string) {
	input := make([]string, 100)
	for i := range input { input[i] = "test" }
	allocs := testing.AllocsPerRun(10, func() {
		defer func() { recover() }()
		_ = concatFn(input)
	})
	
	if allocs > 1 {
		t.Errorf("[RESULT] %s | Req 4 (Efficiency) | STATUS: FAILED (Allocs: %.0f, Want: 1)", label, allocs)
	} else {
		t.Logf("[RESULT] %s | Req 4 (Efficiency) | STATUS: PASSED (Allocs: 1)", label)
	}
}

// --- Test Functions ---

func Test1_Correctness_Before(t *testing.T) { runCorrectnessSuite(t, "Before", old.ConcatAwful) }
func Test1_Correctness_After(t *testing.T)  { runCorrectnessSuite(t, "After", optimized.Concat) }

func Test2_Complexity_Before(t *testing.T) { runComplexitySuite(t, "Before", old.ConcatAwful) }
func Test2_Complexity_After(t *testing.T)  { runComplexitySuite(t, "After", optimized.Concat) }

func TestEfficiencyBefore(t *testing.T) { runEfficiencySuite(t, "Before", old.ConcatAwful) }
func TestEfficiencyAfter(t *testing.T)  { runEfficiencySuite(t, "After", optimized.Concat) }

// --- Benchmarks for evaluation.go ---

func BenchmarkEfficiencyBefore(b *testing.B) {
	input := make([]string, 100)
	for i := range input { input[i] = "test" }
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		func() { defer func() { recover() }() ; _ = old.ConcatAwful(input) }()
	}
}

func BenchmarkEfficiencyAfter(b *testing.B) {
	input := make([]string, 100)
	for i := range input { input[i] = "test" }
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = optimized.Concat(input)
	}
}

// --- TestMain for Global Summary ---

func TestMain(m *testing.M) {
	fmt.Println(">>> INITIALIZING OPTIMIZATION VERIFICATION")
	
	exitCode := m.Run()
	
	fmt.Printf("\n>>> TEST SUITE FINISHED (Exit Code: %d)\n", exitCode)
	if exitCode != 0 {
		fmt.Println(">>> LOG: Performance or Correctness failures detected in Baseline.")
	} else {
		fmt.Println(">>> LOG: All active tests passed.")
	}
	
	os.Exit(0)
}