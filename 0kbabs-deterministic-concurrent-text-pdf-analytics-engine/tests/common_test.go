package tests

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
	"runtime"
)

var (
	RepoRoot   string
	BeforeExe  string
	AfterExe   string
	TargetExe  string
	TargetSource string
)

func init() {
	wd, _ := os.Getwd()
	if strings.HasSuffix(wd, "tests") {
		RepoRoot = filepath.Dir(wd)
	} else {
		RepoRoot = wd
	}

	if runtime.GOOS == "windows" {
		BeforeExe = filepath.Join(RepoRoot, "before.exe")
		AfterExe = filepath.Join(RepoRoot, "after.exe")
	} else {
		// In Docker/Linux, we expect binaries in /usr/local/bin/ to avoid volume mounting issues
		BeforeExe = "/usr/local/bin/before-analyzer"
		AfterExe = "/usr/local/bin/after-analyzer"
	}

	targetStr := os.Getenv("TEST_TARGET")
	if targetStr == "before" {
		TargetExe = BeforeExe
		TargetSource = filepath.Join(RepoRoot, "repository_before", "main.go")
	} else {
		TargetExe = AfterExe
		TargetSource = filepath.Join(RepoRoot, "repository_after", "main.go")
	}
}

func RunAnalyzer(t *testing.T, exe string, filepath string) (string, error) {
	cmd := exec.Command(exe, filepath)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Timeout
	done := make(chan error, 1)
	go func() {
		done <- cmd.Run()
	}()

	select {
	case <-time.After(30 * time.Second):
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		return "", fmt.Errorf("timeout")
	case err := <-done:
		if err != nil {
			return stdout.String(), fmt.Errorf("command failed: %v, stderr: %s", err, stderr.String())
		}
	}
	return stdout.String(), nil
}

func ParseReport(output string) map[string]int {
	counts := make(map[string]int)
	scanner := bufio.NewScanner(strings.NewReader(output))
	startParsing := false
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "--- Analytics Report") {
			startParsing = true
			continue
		}
		if startParsing {
			if strings.Contains(line, ": ") {
				parts := strings.SplitN(line, ": ", 2)
				if len(parts) == 2 {
					count, err := strconv.Atoi(parts[1])
					if err == nil {
						counts[parts[0]] = count
					}
				}
			}
		}
	}
	return counts
}
