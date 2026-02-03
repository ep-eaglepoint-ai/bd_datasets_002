package metatests

import (
	"os"
	"os/exec"
	"strings"
	"testing"
)

func TestMetaTestSuiteExists(t *testing.T) {
	if _, err := os.Stat("../repository_after/auditlogger_test.go"); os.IsNotExist(err) {
		t.Fatal("Test file auditlogger_test.go does not exist in repository_after")
	}
}

func TestMetaTestsCompile(t *testing.T) {
	// Use "go test -c" to compile test files (go build doesn't work for test-only packages)
	cmd := exec.Command("go", "test", "-c", "-o", "/dev/null", ".")
	cmd.Dir = "../repository_after"
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Tests failed to compile: %v\nOutput: %s", err, string(output))
	}
}

func TestMetaRequirement1_SamplingAboveRate(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "TestSampling_RandomAboveSampleRate") {
		t.Error("Missing test for Requirement 1: sampling above rate")
	}
}

func TestMetaRequirement2_SamplingBelowRate(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "TestSampling_RandomBelowSampleRate") {
		t.Error("Missing test for Requirement 2: sampling below rate")
	}
}

func TestMetaRequirement3_RingBufferEviction(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "TestRingBuffer_EvictsOldestEntries") {
		t.Error("Missing test for Requirement 3: ring buffer eviction")
	}
}

func TestMetaRequirement4_DedupeEnabled(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "TestDedupe_Enabled") {
		t.Error("Missing test for Requirement 4: dedupe enabled")
	}
}

func TestMetaRequirement5_DedupeDisabled(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "TestDedupe_Disabled") {
		t.Error("Missing test for Requirement 5: dedupe disabled")
	}
}

func TestMetaRequirement6_RedactionRules(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "TestRedaction_") {
		t.Error("Missing test for Requirement 6: redaction rules")
	}
}

func TestMetaRequirement7_HashingRules(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "TestHashing_") {
		t.Error("Missing test for Requirement 7: hashing rules")
	}
}

func TestMetaRequirement8_Truncation(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "TestTruncation_") {
		t.Error("Missing test for Requirement 8: truncation")
	}
}

func TestMetaRequirement9_TruncatedMeta(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "Meta.Truncated") {
		t.Error("Missing assertion for Requirement 9: Meta.Truncated")
	}
}

func TestMetaRequirement10_TruncationMarkers(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	if !strings.Contains(string(content), "__truncated") || !strings.Contains(string(content), "__more") {
		t.Error("Missing test for Requirement 10: truncation markers")
	}
}

func TestMetaFakesImplemented(t *testing.T) {
	content, err := os.ReadFile("../repository_after/auditlogger_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}

	required := []string{"FakeClock", "FakeRandomSource", "FakeSink"}
	for _, fake := range required {
		if !strings.Contains(string(content), fake) {
			t.Errorf("Missing fake implementation: %s", fake)
		}
	}
}

func TestMetaTestsActuallyRun(t *testing.T) {
	// Run the actual tests and verify they execute
	cmd := exec.Command("go", "test", "-v", "-count=1", "-run", "TestSampling_ZeroSampleRate", ".")
	cmd.Dir = "../repository_after"
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Tests failed to run: %v\nOutput: %s", err, string(output))
	}
	if !strings.Contains(string(output), "PASS") {
		t.Errorf("Expected test to pass, output: %s", string(output))
	}
}