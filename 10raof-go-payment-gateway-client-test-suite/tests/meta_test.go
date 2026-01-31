package tests

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func getTargetRepo() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	projectRoot := filepath.Dir(cwd)

	if _, err := os.Stat(filepath.Join(projectRoot, "go.mod")); os.IsNotExist(err) {
		if _, err := os.Stat(filepath.Join(cwd, "go.mod")); err == nil {
			projectRoot = cwd
		} else {
			return "", fmt.Errorf("could not locate project root from %s", cwd)
		}
	}

	repoName := os.Getenv("TARGET_REPO")
	if repoName == "" {
		repoName = "repository_after"
	}
	return filepath.Join(projectRoot, repoName), nil
}

func TestRepositoryStructure(t *testing.T) {
	repoPath, err := getTargetRepo()
	require.NoError(t, err)

	t.Logf("Evaluating Structure of: %s", filepath.Base(repoPath))

	testsDir := filepath.Join(repoPath, "tests")

	t.Run("TestsDirectoryExists", func(t *testing.T) {
		info, err := os.Stat(testsDir)
		if os.IsNotExist(err) {
			t.Fatalf("tests directory not found at %s", testsDir)
		}
		require.NoError(t, err)
		assert.True(t, info.IsDir(), "tests path should be a directory")
	})

	t.Run("TestFilesExist", func(t *testing.T) {
		if _, err := os.Stat(testsDir); err != nil {
			t.Errorf("tests directory is missing, cannot check for test files")
			return
		}

		entries, err := os.ReadDir(testsDir)
		require.NoError(t, err)

		found := false
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(e.Name(), "_test.go") {
				found = true
				break
			}
		}
		assert.True(t, found, "should contain at least one _test.go file")
	})
}

func TestUnitTestsPass(t *testing.T) {
	repoPath, err := getTargetRepo()
	require.NoError(t, err)

	t.Run("RunGoTest", func(t *testing.T) {
		cmd := exec.Command("go", "test", "-json", "./tests/...")
		cmd.Dir = repoPath
		cmd.Env = os.Environ()

		stdout, _ := cmd.StdoutPipe()
		if err := cmd.Start(); err != nil {
			t.Fatalf("Failed to start go test: %v", err)
		}

		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			var event struct {
				Action string
				Test   string
			}
			if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
				continue
			}

			if event.Test != "" && (event.Action == "pass" || event.Action == "fail" || event.Action == "skip") {
				t.Run(event.Test, func(t *testing.T) {
					switch event.Action {
case "fail":
						t.Fail()
					case "skip":
						t.Skip()
					}
				})
			}
		}

		if err := cmd.Wait(); err != nil {
			t.Errorf("go test command failed: %v", err)
		}
	})
}
