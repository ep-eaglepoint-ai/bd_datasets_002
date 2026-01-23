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

func TestMain(m *testing.M) {
	// Parse flags to ensure testing flags are handled
	flag.Parse()

	// Run tests
	code := m.Run()
	if os.Getenv("TEST_TARGET") == "before" {
		os.Exit(0)
	}

	os.Exit(code)
}

func init() {
	wd, _ := os.Getwd()
	if strings.HasSuffix(wd, "tests") {
		RepoRoot = filepath.Dir(wd)
	} else {
		RepoRoot = wd
	}

	// Dynamic Binary Discovery/Build
	// This ensures tests work in Docker (pre-built), CI (fresh env), and Local (Windows/Linux)
	BeforeExe = resolveOrBuild("before", "repository_before")
	AfterExe = resolveOrBuild("after", "repository_after")

	targetStr := os.Getenv("TEST_TARGET")
	if targetStr == "before" {
		TargetExe = BeforeExe
		TargetSource = filepath.Join(RepoRoot, "repository_before", "main.go")
	} else {
		TargetExe = AfterExe
		TargetSource = filepath.Join(RepoRoot, "repository_after", "main.go")
	}
}

func resolveOrBuild(name, dir string) string {
	// 1. Check Docker pre-built location (Linux only)
	if runtime.GOOS != "windows" {
		dockerPath := "/usr/local/bin/" + name + "-analyzer"
		if _, err := os.Stat(dockerPath); err == nil {
			return dockerPath
		}
	}

	// 2. Check local directory (e.g. built by user)
	localName := name
	if runtime.GOOS == "windows" {
		localName += ".exe"
	}
	localPath := filepath.Join(RepoRoot, localName)
	if _, err := os.Stat(localPath); err == nil {
		return localPath
	}

	// 3. Fallback: Build it on the fly!
	// This handles CI environments that run 'go test' without a prior build step
	fmt.Printf("Binary %s not found. Building on the fly...\n", name)
	srcPath := filepath.Join(RepoRoot, dir, "main.go")
	outPath := filepath.Join(RepoRoot, localName) // Build into repo root
	
	cmd := exec.Command("go", "build", "-o", outPath, srcPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		// If build fails, we can't really recover, but usually tests will fail later.
		// Panic here to make it obvious why.
		panic(fmt.Sprintf("Failed to build %s: %v", name, err))
	}
	return outPath
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
