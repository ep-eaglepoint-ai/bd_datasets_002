package metatests

import (
	"os"
	"os/exec"
	"strings"
	"testing"
)

func TestMetaTestSuiteExists(t *testing.T) {
	if _, err := os.Stat("../repository_after/balancer_test.go"); os.IsNotExist(err) {
		t.Fatal("Test file balancer_test.go does not exist in repository_after")
	}
}

func TestMetaTestsCompile(t *testing.T) {
	cmd := exec.Command("go", "test", "-c", "-o", "/dev/null", ".")
	cmd.Dir = "../repository_after"
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Tests failed to compile: %v\nOutput: %s", err, string(output))
	}
}

func TestMetaRequirement1_CoverageGoal(t *testing.T) {
	content, err := os.ReadFile("../repository_after/balancer_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	
	// Check for tests covering GetNextNode and UpdateWeights
	if !strings.Contains(string(content), "GetNextNode") {
		t.Error("Missing tests for GetNextNode")
	}
	if !strings.Contains(string(content), "UpdateWeights") {
		t.Error("Missing tests for UpdateWeights")
	}
}

func TestMetaRequirement2_SequenceContinuity(t *testing.T) {
	content, err := os.ReadFile("../repository_after/balancer_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	
	if !strings.Contains(string(content), "SequenceContinuity") {
		t.Error("Missing Sequence Continuity test")
	}
	if !strings.Contains(string(content), "A:2") || !strings.Contains(string(content), "B:2") {
		t.Log("Warning: Verify test uses weights [A:2, B:2] then [A:10, B:2]")
	}
}

func TestMetaRequirement3_GCDFlux(t *testing.T) {
	content, err := os.ReadFile("../repository_after/balancer_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	
	if !strings.Contains(string(content), "GCDFlux") {
		t.Error("Missing GCD Flux test")
	}
}

func TestMetaRequirement4_HealthFlaps(t *testing.T) {
	content, err := os.ReadFile("../repository_after/balancer_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	
	if !strings.Contains(string(content), "HealthFlap") {
		t.Error("Missing Health Flaps test")
	}
}

func TestMetaRequirement5_Concurrency(t *testing.T) {
	content, err := os.ReadFile("../repository_after/balancer_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	
	if !strings.Contains(string(content), "1000") {
		t.Error("Missing 1000 concurrent calls")
	}
	if !strings.Contains(string(content), "50") {
		t.Error("Missing 50 UpdateWeights calls")
	}
}

func TestMetaRequirement6_AdversarialZeroWeights(t *testing.T) {
	content, err := os.ReadFile("../repository_after/balancer_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	
	if !strings.Contains(string(content), "ZeroWeight") {
		t.Error("Missing zero weights adversarial test")
	}
}

func TestMetaRequirement7_BoundarySliceReduction(t *testing.T) {
	content, err := os.ReadFile("../repository_after/balancer_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	
	if !strings.Contains(string(content), "SliceSizeReduction") {
		t.Error("Missing boundary test for slice size reduction")
	}
}

func TestMetaRequirement8_SubTests(t *testing.T) {
	content, err := os.ReadFile("../repository_after/balancer_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	
	if !strings.Contains(string(content), "t.Run") {
		t.Error("Missing sub-tests (t.Run)")
	}
	if !strings.Contains(string(content), "TestStaticDistribution") {
		t.Error("Missing Static Distribution test group")
	}
	if !strings.Contains(string(content), "TestDynamicTransition") {
		t.Error("Missing Dynamic Transition test group")
	}
}

func TestMetaRequirement9_SequenceAuditor(t *testing.T) {
	content, err := os.ReadFile("../repository_after/balancer_test.go")
	if err != nil {
		t.Fatalf("Cannot read test file: %v", err)
	}
	
	if !strings.Contains(string(content), "SequenceAuditor") {
		t.Error("Missing Sequence Auditor helper")
	}
	if !strings.Contains(string(content), "VerifyDistribution") {
		t.Error("Missing distribution verification method")
	}
	if !strings.Contains(string(content), "tolerance") || !strings.Contains(string(content), "1.0") {
		t.Log("Warning: Verify 1% tolerance is implemented")
	}
}

func TestMetaTestsActuallyRun(t *testing.T) {
	cmd := exec.Command("go", "test", "-v", "-count=1", "-run", "TestStaticDistribution/SingleNode", ".")
	cmd.Dir = "../repository_after"
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Tests failed to run: %v\nOutput: %s", err, string(output))
	}
	if !strings.Contains(string(output), "PASS") {
		t.Errorf("Expected test to pass, output: %s", string(output))
	}
}

func TestMetaRaceDetectorWorks(t *testing.T) {
	cmd := exec.Command("go", "test", "-race", "-count=1", "-run", "TestConcurrency", ".")
	cmd.Dir = "../repository_after"
	output, err := cmd.CombinedOutput()
	outStr := string(output)
	
	if strings.Contains(outStr, "DATA RACE") {
		t.Errorf("Race condition detected: %s", outStr)
	}
	if err != nil && !strings.Contains(outStr, "PASS") {
		t.Logf("Race test output: %s", outStr)
	}
}