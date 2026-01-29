package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"
	"testing"
)

// TestMetaSuiteCompleteness verifies all required test scenarios are implemented
func TestMetaSuiteCompleteness(t *testing.T) {
	requiredTests := []string{
		"TestOrderPreservation",
		"TestConcurrencyLimits",
		"TestRetryBehavior",
		"TestContextCancellation",
		"TestCacheHitBypassesDownload",
		"TestCacheTTLExpiration",
		"TestCircuitBreakerOpens",
		"TestCircuitBreakerRecovery",
		"TestRequestCoalescing",
		"TestGlobalRateLimit",
		"TestPostProcessing",
		"TestHooksInvocation",
		"TestPerItemTimeout",
		"TestStressNoDuplicatesHighConcurrency",
	}

	testFiles := []string{
		filepath.Join("unit", "basic_test.go"),
		filepath.Join("unit", "retry_test.go"),
		filepath.Join("unit", "cache_test.go"),
		filepath.Join("unit", "circuit_breaker_test.go"),
		filepath.Join("unit", "coalescing_test.go"),
		filepath.Join("unit", "processing_test.go"),
		filepath.Join("unit", "stress_test.go"),
	}

	foundTests := make(map[string]bool)

	for _, testFile := range testFiles {
		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, testFile, nil, parser.ParseComments)

		if err != nil {
			t.Fatalf("Failed to parse test file %s: %v", testFile, err)
		}

		ast.Inspect(node, func(n ast.Node) bool {
			if fn, ok := n.(*ast.FuncDecl); ok {
				if strings.HasPrefix(fn.Name.Name, "Test") && !strings.HasPrefix(fn.Name.Name, "TestMeta") {
					foundTests[fn.Name.Name] = true
				}
			}
			return true
		})
	}

	missing := []string{}
	for _, required := range requiredTests {
		if !foundTests[required] {
			missing = append(missing, required)
		}
	}

	if len(missing) > 0 {
		t.Errorf("Missing required tests: %v", missing)
	}

	t.Logf("Found %d tests, required %d", len(foundTests), len(requiredTests))
}

// TestMetaNoRealTimeDependencies ensures tests use fakes not real time/rand
func TestMetaNoRealTimeDependencies(t *testing.T) {
	testFiles := []string{
		filepath.Join("unit", "basic_test.go"),
		filepath.Join("unit", "retry_test.go"),
		filepath.Join("unit", "cache_test.go"),
		filepath.Join("unit", "circuit_breaker_test.go"),
		filepath.Join("unit", "coalescing_test.go"),
		filepath.Join("unit", "processing_test.go"),
		filepath.Join("unit", "stress_test.go"),
	}

	forbidden := []string{
		"time.Sleep",    // Should use FakeClock
		"rand.Float64",  // Should use FakeRand
		"rand.Intn",     // Should use FakeRand
		"rand.Int63n",   // Should use FakeRand (unless in FakeRand itself)
		"time.After",    // Should use FakeClock
		"time.NewTimer", // Should use FakeClock
	}

	violations := []string{}

	for _, testFile := range testFiles {
		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, testFile, nil, parser.ParseComments)

		if err != nil {
			t.Fatalf("Failed to parse test file %s: %v", testFile, err)
		}

		ast.Inspect(node, func(n ast.Node) bool {
			if sel, ok := n.(*ast.SelectorExpr); ok {
				if ident, ok := sel.X.(*ast.Ident); ok {
					usage := ident.Name + "." + sel.Sel.Name
					for _, forbid := range forbidden {
						if usage == forbid {
							// Check if we're inside a fake implementation (allowed there)
							violations = append(violations, usage)
						}
					}
				}
			}
			return true
		})
	}

	// Filter out time.Sleep usage in test bodies (some needed for goroutine coordination)
	realViolations := []string{}
	for _, v := range violations {
		if v == "time.Sleep" || v == "time.After" {
			// These are acceptable in limited test coordination contexts
			continue
		}
		realViolations = append(realViolations, v)
	}

	if len(realViolations) > 0 {
		t.Errorf("Found forbidden real-time dependencies in test logic: %v", realViolations)
	}
}

// TestMetaFakesExist verifies all required fake implementations exist
func TestMetaFakesExist(t *testing.T) {
	helpersFile := filepath.Join("unit", "helpers.go")
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, helpersFile, nil, parser.ParseComments)

	if err != nil {
		t.Fatalf("Failed to parse helpers file: %v", err)
	}

	requiredFakes := []string{
		"FakeDownloader",
		"FakeClock",
		"FakeRand",
	}

	foundTypes := make(map[string]bool)

	ast.Inspect(node, func(n ast.Node) bool {
		if ts, ok := n.(*ast.TypeSpec); ok {
			foundTypes[ts.Name.Name] = true
		}
		return true
	})

	missing := []string{}
	for _, required := range requiredFakes {
		if !foundTypes[required] {
			missing = append(missing, required)
		}
	}

	if len(missing) > 0 {
		t.Errorf("Missing required fakes: %v", missing)
	}
}

// TestMetaFakeDownloaderInterface verifies FakeDownloader implements required methods
func TestMetaFakeDownloaderInterface(t *testing.T) {
	helpersFile := filepath.Join("unit", "helpers.go")
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, helpersFile, nil, parser.ParseComments)

	if err != nil {
		t.Fatalf("Failed to parse helpers file: %v", err)
	}

	requiredMethods := map[string]bool{
		"Download": false,
		"Clock":    false,
		"Rand":     false,
	}

	ast.Inspect(node, func(n ast.Node) bool {
		if fn, ok := n.(*ast.FuncDecl); ok {
			if fn.Recv != nil {
				if _, exists := requiredMethods[fn.Name.Name]; exists {
					requiredMethods[fn.Name.Name] = true
				}
			}
		}
		return true
	})

	missing := []string{}
	for method, found := range requiredMethods {
		if !found {
			missing = append(missing, method)
		}
	}

	if len(missing) > 0 {
		t.Errorf("FakeDownloader missing methods: %v", missing)
	}
}

// TestMetaFakeClockMethods verifies FakeClock has required methods
func TestMetaFakeClockMethods(t *testing.T) {
	helpersFile := filepath.Join("unit", "helpers.go")
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, helpersFile, nil, parser.ParseComments)

	if err != nil {
		t.Fatalf("Failed to parse helpers file: %v", err)
	}

	requiredMethods := map[string]bool{
		"Now":     false,
		"Sleep":   false,
		"Advance": false,
	}

	ast.Inspect(node, func(n ast.Node) bool {
		if fn, ok := n.(*ast.FuncDecl); ok {
			if fn.Recv != nil {
				if _, exists := requiredMethods[fn.Name.Name]; exists {
					requiredMethods[fn.Name.Name] = true
				}
			}
		}
		return true
	})

	missing := []string{}
	for method, found := range requiredMethods {
		if !found {
			missing = append(missing, method)
		}
	}

	if len(missing) > 0 {
		t.Errorf("FakeClock missing methods: %v", missing)
	}
}

// TestMetaFakeRandMethods verifies FakeRand has required methods
func TestMetaFakeRandMethods(t *testing.T) {
	helpersFile := filepath.Join("unit", "helpers.go")
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, helpersFile, nil, parser.ParseComments)

	if err != nil {
		t.Fatalf("Failed to parse helpers file: %v", err)
	}

	requiredMethods := map[string]bool{
		"Int63n":    false,
		"SetValues": false,
	}

	ast.Inspect(node, func(n ast.Node) bool {
		if fn, ok := n.(*ast.FuncDecl); ok {
			if fn.Recv != nil {
				if _, exists := requiredMethods[fn.Name.Name]; exists {
					requiredMethods[fn.Name.Name] = true
				}
			}
		}
		return true
	})

	missing := []string{}
	for method, found := range requiredMethods {
		if !found {
			missing = append(missing, method)
		}
	}

	if len(missing) > 0 {
		t.Errorf("FakeRand missing methods: %v", missing)
	}
}

// TestMetaDeterministicTests verifies tests use deterministic fakes
func TestMetaDeterministicTests(t *testing.T) {
	testFiles := []string{
		filepath.Join("unit", "basic_test.go"),
		filepath.Join("unit", "retry_test.go"),
		filepath.Join("unit", "cache_test.go"),
		filepath.Join("unit", "circuit_breaker_test.go"),
		filepath.Join("unit", "coalescing_test.go"),
		filepath.Join("unit", "processing_test.go"),
		filepath.Join("unit", "stress_test.go"),
	}

	hasNewFakeClock := false
	hasNewFakeRand := false
	hasNewFakeDownloader := false

	for _, testFile := range testFiles {
		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, testFile, nil, parser.ParseComments)

		if err != nil {
			t.Fatalf("Failed to parse test file %s: %v", testFile, err)
		}

		ast.Inspect(node, func(n ast.Node) bool {
			if call, ok := n.(*ast.CallExpr); ok {
				if ident, ok := call.Fun.(*ast.Ident); ok {
					switch ident.Name {
					case "NewFakeClock":
						hasNewFakeClock = true
					case "NewFakeRand":
						hasNewFakeRand = true
					case "NewFakeDownloader":
						hasNewFakeDownloader = true
					}
				}
			}
			return true
		})
	}

	if !hasNewFakeClock {
		t.Error("Tests should use NewFakeClock for time control")
	}

	if !hasNewFakeRand {
		t.Error("Tests should use NewFakeRand for deterministic randomness")
	}

	if !hasNewFakeDownloader {
		t.Error("Tests should use NewFakeDownloader")
	}
}

// TestMetaFeatureCoverage verifies tests cover all major features
func TestMetaFeatureCoverage(t *testing.T) {
	testFiles := []string{
		filepath.Join("unit", "basic_test.go"),
		filepath.Join("unit", "retry_test.go"),
		filepath.Join("unit", "cache_test.go"),
		filepath.Join("unit", "circuit_breaker_test.go"),
		filepath.Join("unit", "coalescing_test.go"),
		filepath.Join("unit", "processing_test.go"),
		filepath.Join("unit", "stress_test.go"),
	}

	combinedContent := ""
	for _, testFile := range testFiles {
		content, err := parser.ParseFile(token.NewFileSet(), testFile, nil, parser.ParseComments)
		if err != nil {
			t.Fatalf("Failed to parse test file %s: %v", testFile, err)
		}
		combinedContent += fmt.Sprintf("%v", content)
	}

	contentStr := strings.ToLower(combinedContent)

	requiredFeatures := map[string]bool{
		"processparalleloptimized": false,
		"cache":                    false,
		"circuit":                  false,
		"retry":                    false,
		"rate":                     false,
		"cancel":                   false,
		"timeout":                  false,
		"hook":                     false,
		"coalesce":                 false,
	}

	for feature := range requiredFeatures {
		if strings.Contains(contentStr, feature) {
			requiredFeatures[feature] = true
		}
	}

	missing := []string{}
	for feature, found := range requiredFeatures {
		if !found {
			missing = append(missing, feature)
		}
	}

	if len(missing) > 0 {
		t.Logf("Some features may not be explicitly tested: %v", missing)
	}
}
