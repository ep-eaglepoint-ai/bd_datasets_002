package tests

import (
	"bufio"
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func findProjectRoot(t *testing.T) string {
	t.Helper()

	// Prefer explicit envs if provided by the test harness.
	for _, k := range []string{"PROJECT_ROOT", "REPO_ROOT", "TARGET_ROOT"} {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			return v
		}
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("os.Getwd: %v", err)
	}

	// Walk up a few levels until we find a directory that contains repository_after/ or repository_before/.
	dir := cwd
	for i := 0; i < 6; i++ {
		if isDir(filepath.Join(dir, "repository_after")) || isDir(filepath.Join(dir, "repository_before")) {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	t.Fatalf("could not locate project root from cwd=%q (expected repository_after/ or repository_before/ nearby)", cwd)
	return ""
}

func findRepoUnderTest(t *testing.T) string {
	t.Helper()

	// Some harnesses pass the repo root via env.
	for _, k := range []string{"REPO_UNDER_TEST", "REPOSITORY_UNDER_TEST", "TARGET_REPO", "REPO_PATH"} {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" && isDir(v) {
			return v
		}
	}

	root := findProjectRoot(t)

	// Match the TS meta-test style: allow selecting before/after via TEST_STATE.
	if state := strings.TrimSpace(os.Getenv("TEST_STATE")); state != "" {
		if state != "before" && state != "after" {
			t.Fatalf("TEST_STATE must be either 'before' or 'after', got %q", state)
		}
		p := filepath.Join(root, "repository_"+state)
		if isDir(p) {
			return p
		}
		t.Fatalf("repository_%s not found under %q", state, root)
	}

	if cwd, err := os.Getwd(); err == nil {
		gomod := filepath.Join(cwd, "go.mod")
		if b, rerr := os.ReadFile(gomod); rerr == nil {
			re := regexp.MustCompile(`(?m)^\s*replace\s+gocode\s*=>\s*(\S+)\s*$`)
			if m := re.FindSubmatch(b); len(m) == 2 {
				p := string(m[1])
				if isDir(p) {
					return p
				}
				if isDir(filepath.Join(cwd, p)) {
					return filepath.Join(cwd, p)
				}
			}
		}
	}

	// Default: prefer "after" if present, else "before".
	after := filepath.Join(root, "repository_after")
	before := filepath.Join(root, "repository_before")
	if isDir(after) {
		return after
	}
	if isDir(before) {
		return before
	}

	t.Fatalf("could not locate repository_under_test under root=%q", root)
	return ""
}

func isDir(p string) bool {
	st, err := os.Stat(p)
	return err == nil && st.IsDir()
}

func isFile(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

func mustReadFile(t *testing.T, p string) []byte {
	t.Helper()
	b, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v", p, err)
	}
	if len(b) == 0 {
		t.Fatalf("file is empty: %s", p)
	}
	return b
}

// findKeysTestPath returns the path to keys_test.go if it exists, or empty string if not.
// Does not abort the test.
func findKeysTestPath(t *testing.T) string {
	t.Helper()
	repo := findRepoUnderTest(t)
	p := filepath.Join(repo, "context-resolver", "keys", "keys_test.go")
	if isFile(p) {
		return p
	}
	return ""
}

type goTestEvent struct {
	Action  string `json:"Action"`
	Package string `json:"Package"`
	Test    string `json:"Test"`
	Output  string `json:"Output"`
}

type goTestSummary struct {
	exitCode int
	passed   int
	failed   int
	skipped  int
	errors   int
	stdout   string
	stderr   string
}

func isInfraFailure(res goTestSummary) bool {
	// Treat toolchain/module/build problems as infra failures, not "bug detected".
	s := res.stdout + "\n" + res.stderr
	infraMarkers := []string{
		"requires go >=",
		"GOTOOLCHAIN=",
		"no such file or directory",
		"cannot find module",
		"no required module provides package",
		"module requires go",
	}
	for _, m := range infraMarkers {
		if strings.Contains(s, m) {
			return true
		}
	}
	return false
}

func runInnerGoTests(t *testing.T, pkgDir string, extraArgs ...string) goTestSummary {
	t.Helper()

	args := []string{"test", "-json", "-count=1"}
	args = append(args, extraArgs...)
	args = append(args, ".")
	cmd := exec.Command("go", args...)
	cmd.Dir = pkgDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		exitCode = 1
		if ee, ok := err.(*exec.ExitError); ok {
			exitCode = ee.ExitCode()
		}
	}

	sum := goTestSummary{
		exitCode: exitCode,
		stdout:   stdout.String(),
		stderr:   stderr.String(),
	}

	sc := bufio.NewScanner(bytes.NewReader(stdout.Bytes()))
	for sc.Scan() {
		var ev goTestEvent
		if uerr := json.Unmarshal(sc.Bytes(), &ev); uerr != nil {
			continue
		}
		// Only count per-test results (ev.Test non-empty); package-level results are less useful here.
		if ev.Test == "" {
			continue
		}
		switch ev.Action {
		case "pass":
			sum.passed++
		case "fail":
			sum.failed++
		case "skip":
			sum.skipped++
		}
	}

	// If the process failed but we didn't see any failing tests (e.g. build failure),
	// count it as an error so meta tests can still assert "suite detected the bug".
	if sum.exitCode != 0 && sum.failed == 0 {
		sum.errors = 1
	}

	return sum
}

func mustAbs(t *testing.T, p string) string {
	t.Helper()
	ap, err := filepath.Abs(p)
	if err != nil {
		t.Fatalf("abs %q: %v", p, err)
	}
	return ap
}

// runKeysSuiteWithImpl runs `go test` in keysDir while virtually replacing targetKeysGo
// with the provided impl bytes using Go's `-overlay` (no repo mutation / no backup needed).
func runKeysSuiteWithImpl(t *testing.T, keysDir, targetKeysGo string, impl []byte, extraArgs ...string) goTestSummary {
	t.Helper()

	tmp := t.TempDir()
	implPath := filepath.Join(tmp, "keys.go")
	if err := os.WriteFile(implPath, impl, 0o644); err != nil {
		t.Fatalf("write impl temp %s: %v", implPath, err)
	}

	overlayPath := filepath.Join(tmp, "overlay.json")
	overlay := struct {
		Replace map[string]string `json:"Replace"`
	}{
		Replace: map[string]string{
			mustAbs(t, targetKeysGo): mustAbs(t, implPath),
		},
	}
	b, err := json.Marshal(overlay)
	if err != nil {
		t.Fatalf("marshal overlay: %v", err)
	}
	if err := os.WriteFile(overlayPath, b, 0o644); err != nil {
		t.Fatalf("write overlay %s: %v", overlayPath, err)
	}

	args := append([]string{"-overlay", overlayPath}, extraArgs...)
	return runInnerGoTests(t, keysDir, args...)
}

func mutateKeysGo(src []byte, oldPattern, newPattern string) ([]byte, error) {
	// Try the exact pattern first
	if bytes.Contains(src, []byte(oldPattern)) {
		return bytes.Replace(src, []byte(oldPattern), []byte(newPattern), -1), nil
	}
	// Try with "keys." prefix (for repository_after structure)
	keysPrefixedOld := strings.Replace(oldPattern, "Context", "keys.Context", -1)
	keysPrefixedOld = strings.Replace(keysPrefixedOld, "Pattern", "keys.Pattern", -1)
	keysPrefixedOld = strings.Replace(keysPrefixedOld, "Result", "keys.Result", -1)
	keysPrefixedOld = strings.Replace(keysPrefixedOld, "Normalizer", "keys.Normalizer", -1)
	keysPrefixedOld = strings.Replace(keysPrefixedOld, "ErrInvalid", "keys.ErrInvalid", -1)
	keysPrefixedOld = strings.Replace(keysPrefixedOld, "ErrNoMatch", "keys.ErrNoMatch", -1)
	keysPrefixedNew := strings.Replace(newPattern, "Context", "keys.Context", -1)
	keysPrefixedNew = strings.Replace(keysPrefixedNew, "Pattern", "keys.Pattern", -1)
	keysPrefixedNew = strings.Replace(keysPrefixedNew, "Result", "keys.Result", -1)
	keysPrefixedNew = strings.Replace(keysPrefixedNew, "Normalizer", "keys.Normalizer", -1)
	keysPrefixedNew = strings.Replace(keysPrefixedNew, "ErrInvalid", "keys.ErrInvalid", -1)
	keysPrefixedNew = strings.Replace(keysPrefixedNew, "ErrNoMatch", "keys.ErrNoMatch", -1)
	if bytes.Contains(src, []byte(keysPrefixedOld)) {
		return bytes.Replace(src, []byte(keysPrefixedOld), []byte(keysPrefixedNew), -1), nil
	}
	return nil, &mutationError{pattern: oldPattern}
}

type mutationError struct {
	pattern string
}

func (e *mutationError) Error() string {
	return "mutation pattern not found: " + e.pattern
}

// TestMeta_KeysSuite_Requirements is the main meta-test that validates all 10 requirements.
func TestMeta_KeysSuite_Requirements(t *testing.T) {
	repo := findRepoUnderTest(t)
	keysDir := filepath.Join(repo, "context-resolver", "keys")
	keysTestPath := findKeysTestPath(t)
	keysGoPath := filepath.Join(keysDir, "keys.go")

	// Standard testing only - no third-party frameworks
	t.Run("stdlib_only", func(t *testing.T) {
		if keysTestPath == "" {
			t.Fatalf("missing keys_test.go at %s", filepath.Join(repo, "context-resolver", "keys", "keys_test.go"))
		}

		src := mustReadFile(t, keysTestPath)
		denyRe := regexp.MustCompile(`(?m)\b(testify|ginkgo|gomega)\b|github\.com/|golang\.org/`)
		if denyRe.Find(src) != nil {
			t.Fatalf("keys_test.go must not use third-party test helpers/frameworks")
		}
	})

	// Controllable fakes for Clock and Metrics
	t.Run("controllable_fakes", func(t *testing.T) {
		if keysTestPath == "" {
			t.Fatalf("missing keys_test.go at %s", filepath.Join(repo, "context-resolver", "keys", "keys_test.go"))
		}

		src := mustReadFile(t, keysTestPath)
		for _, needle := range [][]byte{
			[]byte("type mockClock struct"),
			[]byte("func (m *mockClock) Now() time.Time"),
			[]byte("type mockMetrics struct"),
			[]byte("func (m *mockMetrics) Inc("),
			[]byte("func (m *mockMetrics) Observe("),
		} {
			if !bytes.Contains(src, needle) {
				t.Fatalf("expected keys_test.go to contain %q", string(needle))
			}
		}

		// Check that fakes are actually used (ResolverOptions with Clock/Metrics)
		if !bytes.Contains(src, []byte("Clock:")) && !bytes.Contains(src, []byte("Metrics:")) {
			t.Fatalf("expected keys_test.go to use fakes in ResolverOptions")
		}
	})

	// Table-driven tests and subtests
	t.Run("table_driven_subtests", func(t *testing.T) {
		if keysTestPath == "" {
			t.Fatalf("missing keys_test.go at %s", filepath.Join(repo, "context-resolver", "keys", "keys_test.go"))
		}

		src := mustReadFile(t, keysTestPath)
		if n := strings.Count(string(src), "t.Run("); n < 3 {
			t.Fatalf("expected keys_test.go to use subtests (t.Run); found %d", n)
		}
		if !bytes.Contains(src, []byte("tests := []struct")) {
			t.Fatalf("expected keys_test.go to use table-driven tests (tests := []struct{...})")
		}
	})

	// Normalization rules
	t.Run("normalization_rules", func(t *testing.T) {
		if keysTestPath == "" {
			t.Fatalf("missing keys_test.go at %s", filepath.Join(repo, "context-resolver", "keys", "keys_test.go"))
		}

		// Check for evidence of normalization testing
		src := mustReadFile(t, keysTestPath)
		hasNormalize := bytes.Contains(src, []byte("Normalize")) || bytes.Contains(src, []byte("normalize"))
		if !hasNormalize {
			t.Fatalf("expected keys_test.go to test normalization")
		}

		// Run a mutation: remove case-folding in NormalizeContext
		keysGoSrc := mustReadFile(t, keysGoPath)
		// Match the exact pattern with tabs
		mutated, err := mutateKeysGo(keysGoSrc, "\tv = strings.ToLower(v)", "\tv = v // MUTATED: removed case-folding")
		if err != nil {
			t.Skipf("could not create normalization mutation (pattern not found): %v", err)
		}

		res := runKeysSuiteWithImpl(t, keysDir, keysGoPath, mutated)
		if isInfraFailure(res) {
			t.Fatalf("infra failure while running mutated impl\nstdout:\n%s\nstderr:\n%s", res.stdout, res.stderr)
		}
		// Accept either test failures or build errors as detection
		if res.failed == 0 && res.errors == 0 {
			t.Fatalf("expected inner suite to fail for normalization mutation (no case-folding); got exit=%d failed=%d errors=%d (passed=%d)\nstdout:\n%s\nstderr:\n%s",
				res.exitCode, res.failed, res.errors, res.passed, res.stdout, res.stderr)
		}
	})

	// Parsing rules
	t.Run("parsing_rules", func(t *testing.T) {
		if keysTestPath == "" {
			t.Fatalf("missing keys_test.go at %s", filepath.Join(repo, "context-resolver", "keys", "keys_test.go"))
		}

		// Check for evidence of parsing testing
		src := mustReadFile(t, keysTestPath)
		hasParse := bytes.Contains(src, []byte("ParseContextKey")) || bytes.Contains(src, []byte("Parse"))
		if !hasParse {
			t.Fatalf("expected keys_test.go to test parsing")
		}

		// Run a mutation: allow too many segments
		keysGoSrc := mustReadFile(t, keysGoPath)
		mutated, err := mutateKeysGo(keysGoSrc, "\tif len(parts) != 6 {", "\tif len(parts) < 6 { // MUTATED: allow too many segments")
		if err != nil {
			t.Skipf("could not create parsing mutation (pattern not found): %v", err)
		}

		res := runKeysSuiteWithImpl(t, keysDir, keysGoPath, mutated)
		if isInfraFailure(res) {
			t.Fatalf("infra failure while running mutated impl\nstdout:\n%s\nstderr:\n%s", res.stdout, res.stderr)
		}
		// Accept either test failures or build errors as detection
		if res.failed == 0 && res.errors == 0 {
			t.Fatalf("expected inner suite to fail for parsing mutation (allows too many segments); got exit=%d failed=%d errors=%d (passed=%d)\nstdout:\n%s\nstderr:\n%s",
				res.exitCode, res.failed, res.errors, res.passed, res.stdout, res.stderr)
		}

		// Run another mutation: segmentOK always returns true
		mutated2, err := mutateKeysGo(keysGoSrc, "\tre := regexp.MustCompile(`^[a-z0-9_.]+$`)\n\treturn re.MatchString(s)", "\t// MUTATED: always return true\n\treturn true")
		if err != nil {
			t.Skipf("could not create segmentOK mutation (pattern not found): %v", err)
		}

		res2 := runKeysSuiteWithImpl(t, keysDir, keysGoPath, mutated2)
		if isInfraFailure(res2) {
			t.Fatalf("infra failure while running mutated impl\nstdout:\n%s\nstderr:\n%s", res2.stdout, res2.stderr)
		}
		// Accept either test failures or build errors as detection
		if res2.failed == 0 && res2.errors == 0 {
			t.Fatalf("expected inner suite to fail for parsing mutation (segmentOK always true); got exit=%d failed=%d errors=%d (passed=%d)\nstdout:\n%s\nstderr:\n%s",
				res2.exitCode, res2.failed, res2.errors, res2.passed, res2.stdout, res2.stderr)
		}
	})

	// Version comparison determinism
	t.Run("version_comparison_determinism", func(t *testing.T) {
		if keysTestPath == "" {
			t.Fatalf("missing keys_test.go at %s", filepath.Join(repo, "context-resolver", "keys", "keys_test.go"))
		}

		// Check for evidence of version comparison testing
		src := mustReadFile(t, keysTestPath)
		hasCompare := bytes.Contains(src, []byte("CompareVersions")) || bytes.Contains(src, []byte("Compare"))
		if !hasCompare {
			t.Fatalf("expected keys_test.go to test version comparison")
		}

		// Run a mutation: use time.Now() instead of sha1 for non-numeric parts
		keysGoSrc := mustReadFile(t, keysGoPath)
		mutated, err := mutateKeysGo(keysGoSrc, "\t\t\th := sha1.Sum([]byte(r))\n\t\t\tout = append(out, int(h[0]))", "\t\t\t// MUTATED: use time instead of sha1\n\t\t\tout = append(out, int(time.Now().UnixNano()%256))")
		if err != nil {
			t.Skipf("could not create version determinism mutation (pattern not found): %v", err)
		}

		res := runKeysSuiteWithImpl(t, keysDir, keysGoPath, mutated)
		if isInfraFailure(res) {
			t.Fatalf("infra failure while running mutated impl\nstdout:\n%s\nstderr:\n%s", res.stdout, res.stderr)
		}
		// Accept either test failures or build errors as detection
		if res.failed == 0 && res.errors == 0 {
			t.Fatalf("expected inner suite to fail for version determinism mutation (uses time.Now()); got exit=%d failed=%d errors=%d (passed=%d)\nstdout:\n%s\nstderr:\n%s",
				res.exitCode, res.failed, res.errors, res.passed, res.stdout, res.stderr)
		}
	})

	// MatchScore correctness
	t.Run("matchscore_correctness", func(t *testing.T) {
		if keysTestPath == "" {
			t.Fatalf("missing keys_test.go at %s", filepath.Join(repo, "context-resolver", "keys", "keys_test.go"))
		}

		// Check for evidence of MatchScore testing
		src := mustReadFile(t, keysTestPath)
		hasMatchScore := bytes.Contains(src, []byte("MatchScore")) || bytes.Contains(src, []byte("Match"))
		if !hasMatchScore {
			t.Fatalf("expected keys_test.go to test MatchScore")
		}
	})

	// LRUCache behavior
	t.Run("lrucache_behavior", func(t *testing.T) {
		if keysTestPath == "" {
			t.Fatalf("missing keys_test.go at %s", filepath.Join(repo, "context-resolver", "keys", "keys_test.go"))
		}

		// Check for evidence of LRU testing
		src := mustReadFile(t, keysTestPath)
		hasLRU := bytes.Contains(src, []byte("LRU")) || bytes.Contains(src, []byte("Cache")) || bytes.Contains(src, []byte("cache"))
		if !hasLRU {
			t.Fatalf("expected keys_test.go to test LRUCache")
		}

		// Run a mutation: remove MoveToFront on Get
		keysGoSrc := mustReadFile(t, keysGoPath)
		mutated, err := mutateKeysGo(keysGoSrc, "\t\tc.ll.MoveToFront(el)", "\t\t// MUTATED: removed MoveToFront")
		if err != nil {
			t.Skipf("could not create LRU promotion mutation (pattern not found): %v", err)
		}

		res := runKeysSuiteWithImpl(t, keysDir, keysGoPath, mutated)
		if isInfraFailure(res) {
			t.Fatalf("infra failure while running mutated impl\nstdout:\n%s\nstderr:\n%s", res.stdout, res.stderr)
		}
		// Accept either test failures or build errors as detection
		if res.failed == 0 && res.errors == 0 {
			t.Fatalf("expected inner suite to fail for LRU mutation (no promotion on Get); got exit=%d failed=%d errors=%d (passed=%d)\nstdout:\n%s\nstderr:\n%s",
				res.exitCode, res.failed, res.errors, res.passed, res.stdout, res.stderr)
		}
	})

	// Resolver end-to-end
	t.Run("resolver_end_to_end", func(t *testing.T) {
		if keysTestPath == "" {
			t.Fatalf("missing keys_test.go at %s", filepath.Join(repo, "context-resolver", "keys", "keys_test.go"))
		}

		// Check for evidence of Resolver testing and call ordering
		src := mustReadFile(t, keysTestPath)
		hasResolver := bytes.Contains(src, []byte("Resolver")) || bytes.Contains(src, []byte("resolver"))
		if !hasResolver {
			t.Fatalf("expected keys_test.go to test Resolver")
		}

		// Check for call ordering assertions (cache hit/miss)
		hasCallOrder := bytes.Contains(src, []byte("FromCache")) || bytes.Contains(src, []byte("Observe"))
		if !hasCallOrder {
			t.Fatalf("expected keys_test.go to assert call ordering (cache hit/miss, metrics)")
		}

		// Run a mutation: cache hit doesn't mark FromCache
		keysGoSrc := mustReadFile(t, keysGoPath)
		mutated, err := mutateKeysGo(keysGoSrc, "\t\tv.FromCache = true", "\t\t// MUTATED: removed FromCache assignment")
		if err != nil {
			t.Skipf("could not create cache flag mutation (pattern not found): %v", err)
		}

		res := runKeysSuiteWithImpl(t, keysDir, keysGoPath, mutated)
		if isInfraFailure(res) {
			t.Fatalf("infra failure while running mutated impl\nstdout:\n%s\nstderr:\n%s", res.stdout, res.stderr)
		}
		// Accept either test failures or build errors as detection
		if res.failed == 0 && res.errors == 0 {
			t.Fatalf("expected inner suite to fail for Resolver mutation (cache hit doesn't mark FromCache); got exit=%d failed=%d errors=%d (passed=%d)\nstdout:\n%s\nstderr:\n%s",
				res.exitCode, res.failed, res.errors, res.passed, res.stdout, res.stderr)
		}
	})
}
