package tests

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func getProjectRoot(t *testing.T) string {
	wd, _ := os.Getwd()
	if strings.HasSuffix(wd, "tests") {
		return filepath.Dir(wd)
	}
	return wd
}

func TestRepositoryAfterImplementation(t *testing.T) {
	root := getProjectRoot(t)
	repoAfter := filepath.Join(root, "repository_after")
	files := []string{"event.go", "store.go", "memory_store.go", "orchestrator.go", "retry.go", "dispatcher_test.go", "go.mod"}
	for _, f := range files {
		if _, err := os.Stat(filepath.Join(repoAfter, f)); os.IsNotExist(err) {
			t.Errorf("Missing file: %s", f)
		}
	}
}

func TestGoTestsPass(t *testing.T) {
	root := getProjectRoot(t)
	cmd := exec.Command("go", "test", "-v", "./...")
	cmd.Dir = filepath.Join(root, "repository_after")
	if output, err := cmd.CombinedOutput(); err != nil {
		t.Errorf("Tests failed: %s\n%s", err, string(output))
	}
}

func TestEventStateMachine(t *testing.T) {
	root := getProjectRoot(t)
	content, err := os.ReadFile(filepath.Join(root, "repository_after", "event.go"))
	if err != nil {
		t.Fatalf("Could not read event.go")
	}
	s := string(content)
	for _, state := range []string{"PENDING", "IN_FLIGHT", "RETRY_WAIT", "FAILED", "COMPLETED"} {
		if !strings.Contains(s, state) {
			t.Errorf("Missing state: %s", state)
		}
	}
}

func TestOrchestratorGuards(t *testing.T) {
	root := getProjectRoot(t)
	content, _ := os.ReadFile(filepath.Join(root, "repository_after", "orchestrator.go"))
	s := string(content)
	if !strings.Contains(s, "inFlight") && !strings.Contains(s, "InFlight") {
		t.Error("Missing idempotency guard")
	}
	if !strings.Contains(s, "Lock") && !strings.Contains(s, "Mutex") {
		t.Error("Missing locking")
	}
}
