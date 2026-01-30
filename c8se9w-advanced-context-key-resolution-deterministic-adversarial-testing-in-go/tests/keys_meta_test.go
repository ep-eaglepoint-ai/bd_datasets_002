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

	// We care about unit-test semantics here; disable `go vet` to avoid false negatives / toolchain drift
	// (especially when the implementation is overlaid).
	args := []string{"test", "-json", "-vet=off", "-count=1"}
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

func runKeysSuiteWithFixture(t *testing.T, keysDir, targetKeysGo, fixturePath string, extraArgs ...string) goTestSummary {
	t.Helper()
	impl := mustReadFile(t, fixturePath)
	return runKeysSuiteWithImpl(t, keysDir, targetKeysGo, impl, extraArgs...)
}

func requireSuiteFails(t *testing.T, name string, res goTestSummary) {
	t.Helper()
	if isInfraFailure(res) {
		t.Fatalf("infra failure while running %s\nstdout:\n%s\nstderr:\n%s", name, res.stdout, res.stderr)
	}
	// Prefer asserting real test failures (Action=="fail") for broken implementations.
	if res.failed == 0 {
		t.Fatalf("expected inner suite to report at least one failing test for %s; got exit=%d failed=%d errors=%d (passed=%d skipped=%d)\nstdout:\n%s\nstderr:\n%s",
			name, res.exitCode, res.failed, res.errors, res.passed, res.skipped, res.stdout, res.stderr)
	}
}

func requireSuitePasses(t *testing.T, name string, res goTestSummary) {
	t.Helper()
	if isInfraFailure(res) {
		t.Fatalf("infra failure while running %s\nstdout:\n%s\nstderr:\n%s", name, res.stdout, res.stderr)
	}
	// A "pass" must mean tests actually ran. `go test` returns exit=0 for packages with no tests,
	// but that should not satisfy this meta requirement.
	if res.passed == 0 && res.failed == 0 && res.skipped == 0 {
		t.Fatalf("expected inner suite to execute at least one test for %s; got none (package likely has no tests)\nstdout:\n%s\nstderr:\n%s",
			name, res.stdout, res.stderr)
	}
	if res.exitCode != 0 || res.failed != 0 || res.errors != 0 {
		t.Fatalf("expected inner suite to pass for %s; got exit=%d failed=%d errors=%d (passed=%d skipped=%d)\nstdout:\n%s\nstderr:\n%s",
			name, res.exitCode, res.failed, res.errors, res.passed, res.skipped, res.stdout, res.stderr)
	}
}

// TestMeta_KeysSuite_Requirements is the main meta-test that validates all 10 requirements.
func TestMeta_KeysSuite_Requirements(t *testing.T) {
	repo := findRepoUnderTest(t)
	keysDir := filepath.Join(repo, "context-resolver", "keys")
	keysTestPath := findKeysTestPath(t)
	keysGoPath := filepath.Join(keysDir, "keys.go")
	fixturesDir := filepath.Join(findProjectRoot(t), "tests", "resources", "keys")

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
		// Evidence-based checks (less brittle than hard-coding exact names like mockClock/mockMetrics).
		clockTypeRe := regexp.MustCompile(`(?m)^\s*type\s+\w*Clock\w*\s+struct\b`)
		clockNowRe := regexp.MustCompile(`(?m)^\s*func\s*\(\s*\w+\s+\*?\w*Clock\w*\s*\)\s*Now\(\)\s*time\.Time`)
		metricsTypeRe := regexp.MustCompile(`(?m)^\s*type\s+\w*Metrics\w*\s+struct\b`)
		metricsIncRe := regexp.MustCompile(`(?m)^\s*func\s*\(\s*\w+\s+\*?\w*Metrics\w*\s*\)\s*Inc\(\s*\w+\s+string\s*\)`)
		metricsObsRe := regexp.MustCompile(`(?m)^\s*func\s*\(\s*\w+\s+\*?\w*Metrics\w*\s*\)\s*Observe\(\s*\w+\s+string\s*,\s*\w+\s+float64\s*\)`)

		if !clockTypeRe.Match(src) || !clockNowRe.Match(src) {
			t.Fatalf("expected keys_test.go to define a controllable Clock fake (struct + Now() time.Time)")
		}
		if !metricsTypeRe.Match(src) || !metricsIncRe.Match(src) || !metricsObsRe.Match(src) {
			t.Fatalf("expected keys_test.go to define a controllable Metrics fake (struct + Inc(string) + Observe(string,float64))")
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
	})

	// Meta assertions: run the inner keys suite against explicit fixtures via -overlay.
	t.Run("suite_detects_normalization_casefold", func(t *testing.T) {
		res := runKeysSuiteWithFixture(t, keysDir, keysGoPath, filepath.Join(fixturesDir, "broken_no_casefold.go"))
		requireSuiteFails(t, "broken_no_casefold.go", res)
	})

	t.Run("suite_detects_parsing_len_check", func(t *testing.T) {
		res := runKeysSuiteWithFixture(t, keysDir, keysGoPath, filepath.Join(fixturesDir, "broken_allow_too_many_segments.go"))
		requireSuiteFails(t, "broken_allow_too_many_segments.go", res)
	})

	t.Run("suite_detects_parsing_segment_validation", func(t *testing.T) {
		res := runKeysSuiteWithFixture(t, keysDir, keysGoPath, filepath.Join(fixturesDir, "broken_segmentok_always_true.go"))
		requireSuiteFails(t, "broken_segmentok_always_true.go", res)
	})

	t.Run("suite_detects_version_nondeterminism", func(t *testing.T) {
		res := runKeysSuiteWithFixture(t, keysDir, keysGoPath, filepath.Join(fixturesDir, "broken_compareversions_nondeterministic.go"))
		requireSuiteFails(t, "broken_compareversions_nondeterministic.go", res)
	})

	t.Run("suite_detects_lru_promotion", func(t *testing.T) {
		res := runKeysSuiteWithFixture(t, keysDir, keysGoPath, filepath.Join(fixturesDir, "broken_lru_no_promote_on_get.go"))
		requireSuiteFails(t, "broken_lru_no_promote_on_get.go", res)
	})

	t.Run("suite_detects_cachehit_flag", func(t *testing.T) {
		res := runKeysSuiteWithFixture(t, keysDir, keysGoPath, filepath.Join(fixturesDir, "broken_cachehit_missing_fromcache.go"))
		requireSuiteFails(t, "broken_cachehit_missing_fromcache.go", res)
	})

	t.Run("suite_accepts_correct_impl", func(t *testing.T) {
		res := runKeysSuiteWithFixture(t, keysDir, keysGoPath, filepath.Join(fixturesDir, "correct.go"))
		requireSuitePasses(t, "correct.go", res)
	})

	t.Run("suite_accepts_correct_impl_under_race", func(t *testing.T) {
		res := runKeysSuiteWithFixture(t, keysDir, keysGoPath, filepath.Join(fixturesDir, "correct.go"), "-race")
		requireSuitePasses(t, "correct.go (race)", res)
	})
}
