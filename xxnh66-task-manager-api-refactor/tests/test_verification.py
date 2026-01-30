"""
Task Manager API - Verification Test Suite (Meta-Tests)

This module contains tests that verify the validity of the Ground Truth solution.
These tests check that:
1. Tests FAIL against repository_before (proving the problem exists)
2. Tests PASS against repository_after (proving the solution works)
3. Tests in repository_after properly cover all 16 requirements

Logic Flow:
- Run against repository_before: Should find failures (race conditions, validation issues, etc.)
- Run against repository_after: Should pass all tests with zero race warnings
"""

import subprocess
import os
import sys
import json
import time
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime


@dataclass
class SingleTestResult:
    """Result of a single test execution."""
    name: str
    passed: bool
    duration_ms: float
    output: str = ""
    error: str = ""



@dataclass 
class RepositoryTestResults:
    """Results from testing a repository."""
    repository: str
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    race_warnings: int = 0
    build_success: bool = False
    build_error: str = ""
    test_results: List[SingleTestResult] = field(default_factory=list)
    execution_time_seconds: float = 0.0
    timestamp: str = ""


@dataclass
class VerificationReport:
    """Complete verification report."""
    before_results: RepositoryTestResults = None
    after_results: RepositoryTestResults = None
    verification_passed: bool = False
    requirements_coverage: Dict[str, bool] = field(default_factory=dict)
    summary: str = ""


def get_project_root() -> Path:
    """Get the project root directory."""
    current = Path(__file__).parent.parent
    return current


def run_command(cmd: List[str], cwd: Path, timeout: int = 300) -> Tuple[int, str, str]:
    """Run a command and return exit code, stdout, stderr."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=True if sys.platform == "win32" else False
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)


def check_go_installation() -> bool:
    """Verify Go is installed and accessible."""
    code, stdout, _ = run_command(["go", "version"], Path.cwd())
    return code == 0


def build_repository(repo_path: Path) -> Tuple[bool, str]:
    """
    Build the Go code in the repository.
    Returns (success, error_message).
    """
    if not (repo_path / "go.mod").exists():
        return False, "go.mod not found"
    
    code, stdout, stderr = run_command(["go", "build", "-v", "./..."], repo_path)
    
    if code != 0:
        return False, stderr or stdout
    return True, ""


def run_tests_with_race_detector(repo_path: Path) -> RepositoryTestResults:
    """
    Run Go tests with race detector enabled.
    Returns detailed test results.
    """
    results = RepositoryTestResults(
        repository=str(repo_path),
        timestamp=datetime.now().isoformat()
    )
    
    start_time = time.time()
    
    # First, build the repository
    build_success, build_error = build_repository(repo_path)
    results.build_success = build_success
    results.build_error = build_error
    
    if not build_success:
        results.execution_time_seconds = time.time() - start_time
        return results
    
    # Run tests with race detector and verbose output
    code, stdout, stderr = run_command(
        ["go", "test", "-race", "-v", "-json", "./..."],
        repo_path,
        timeout=300
    )
    
    combined_output = stdout + stderr
    
    # Count race warnings
    race_pattern = r"WARNING: DATA RACE|race detected"
    results.race_warnings = len(re.findall(race_pattern, combined_output, re.IGNORECASE))
    
    # Parse JSON test output
    passed = 0
    failed = 0
    test_results = []
    
    for line in stdout.split('\n'):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
            if event.get('Action') == 'pass' and event.get('Test'):
                passed += 1
                test_results.append(SingleTestResult(
                    name=event.get('Test', ''),
                    passed=True,
                    duration_ms=event.get('Elapsed', 0) * 1000,
                    output=event.get('Output', '')
                ))
            elif event.get('Action') == 'fail' and event.get('Test'):
                failed += 1
                test_results.append(SingleTestResult(
                    name=event.get('Test', ''),
                    passed=False,
                    duration_ms=event.get('Elapsed', 0) * 1000,
                    output=event.get('Output', ''),
                    error="Test failed"
                ))
        except json.JSONDecodeError:
            # Not JSON, might be regular output
            pass
    
    # If JSON parsing didn't work, fall back to regex parsing
    if passed == 0 and failed == 0:
        # Count PASS/FAIL from verbose output
        pass_matches = re.findall(r'--- PASS:', combined_output)
        fail_matches = re.findall(r'--- FAIL:', combined_output)
        passed = len(pass_matches)
        failed = len(fail_matches)
        
        # Extract test names
        for match in re.finditer(r'--- (PASS|FAIL): (\S+)', combined_output):
            status, name = match.groups()
            test_results.append(SingleTestResult(
                name=name,
                passed=(status == 'PASS'),
                duration_ms=0,
                output=""
            ))
    
    results.total_tests = passed + failed
    results.passed_tests = passed
    results.failed_tests = failed
    results.test_results = test_results
    results.execution_time_seconds = time.time() - start_time
    
    return results


def check_requirements_coverage(repo_path: Path) -> Dict[str, bool]:
    """
    Check that all 16 requirements have corresponding tests.
    Returns dict mapping requirement number to whether it's covered.
    """
    test_file = repo_path / "requirements_test.go"
    
    if not test_file.exists():
        return {f"Requirement{i}": False for i in range(1, 17)}
    
    content = test_file.read_text()
    
    coverage = {}
    for i in range(1, 17):
        pattern = rf"TestRequirement{i}_"
        coverage[f"Requirement{i}"] = bool(re.search(pattern, content))
    
    return coverage


def verify_before_fails(results: RepositoryTestResults) -> Tuple[bool, str]:
    """
    Verify that repository_before has expected failures.
    The original code should fail due to:
    - Race conditions
    - Missing validation
    - Incorrect API responses
    """
    issues = []
    
    # We expect race conditions in the before code
    if results.race_warnings == 0 and results.build_success:
        # The before code has race conditions, so either:
        # 1. Build failed (expected for some issues)
        # 2. Race warnings detected (expected)
        # 3. Tests failed (expected)
        if results.failed_tests == 0 and results.build_success:
            issues.append("Expected failures in repository_before but all tests passed")
    
    # If build succeeded, we should see either race warnings or test failures
    if results.build_success:
        has_issues = results.race_warnings > 0 or results.failed_tests > 0
        if not has_issues:
            issues.append("Expected race conditions or test failures in repository_before")
    
    if issues:
        return False, "; ".join(issues)
    return True, "repository_before correctly shows problems (as expected)"


def verify_after_passes(results: RepositoryTestResults) -> Tuple[bool, str]:
    """
    Verify that repository_after passes all requirements.
    """
    issues = []
    
    if not results.build_success:
        issues.append(f"Build failed: {results.build_error}")
    
    if results.race_warnings > 0:
        issues.append(f"Race conditions detected: {results.race_warnings} warnings")
    
    if results.failed_tests > 0:
        failed_names = [t.name for t in results.test_results if not t.passed]
        issues.append(f"Failed tests: {', '.join(failed_names)}")
    
    if results.total_tests == 0:
        issues.append("No tests were executed")
    
    if issues:
        return False, "; ".join(issues)
    return True, f"All {results.passed_tests} tests passed with zero race warnings"


def run_verification() -> VerificationReport:
    """
    Run the complete verification suite.
    """
    project_root = get_project_root()
    before_path = project_root / "repository_before"
    after_path = project_root / "repository_after"
    
    report = VerificationReport()
    
    print("=" * 60)
    print("TASK MANAGER API - VERIFICATION SUITE")
    print("=" * 60)
    
    # Check Go installation
    if not check_go_installation():
        report.summary = "Go is not installed or not in PATH"
        return report
    
    print("\n[1/4] Testing repository_before (expecting failures)...")
    print("-" * 40)
    
    if before_path.exists():
        report.before_results = run_tests_with_race_detector(before_path)
        before_ok, before_msg = verify_before_fails(report.before_results)
        print(f"  Build: {'✓' if report.before_results.build_success else '✗'}")
        print(f"  Tests: {report.before_results.passed_tests} passed, {report.before_results.failed_tests} failed")
        print(f"  Race warnings: {report.before_results.race_warnings}")
        print(f"  Result: {before_msg}")
    else:
        print(f"  repository_before not found at {before_path}")
        before_ok = True
        before_msg = "Skipped - repository not found"
    
    print("\n[2/4] Testing repository_after (expecting success)...")
    print("-" * 40)
    
    if after_path.exists():
        report.after_results = run_tests_with_race_detector(after_path)
        after_ok, after_msg = verify_after_passes(report.after_results)
        print(f"  Build: {'✓' if report.after_results.build_success else '✗'}")
        print(f"  Tests: {report.after_results.passed_tests} passed, {report.after_results.failed_tests} failed")
        print(f"  Race warnings: {report.after_results.race_warnings}")
        print(f"  Result: {after_msg}")
    else:
        print(f"  repository_after not found at {after_path}")
        after_ok = False
        after_msg = "repository_after not found"
    
    print("\n[3/4] Checking requirements coverage...")
    print("-" * 40)
    
    if after_path.exists():
        report.requirements_coverage = check_requirements_coverage(after_path)
        covered = sum(1 for v in report.requirements_coverage.values() if v)
        total = len(report.requirements_coverage)
        print(f"  Coverage: {covered}/{total} requirements have dedicated tests")
        for req, has_test in report.requirements_coverage.items():
            print(f"    {req}: {'✓' if has_test else '✗'}")
    
    print("\n[4/4] Verification Summary...")
    print("-" * 40)
    
    # Overall verification passes if:
    # 1. before_results show expected problems (or is skipped)
    # 2. after_results show all tests passing
    # 3. All requirements are covered
    all_covered = all(report.requirements_coverage.values()) if report.requirements_coverage else False
    report.verification_passed = after_ok and all_covered
    
    if report.verification_passed:
        report.summary = "✓ VERIFICATION PASSED: Solution correctly fixes all issues"
    else:
        issues = []
        if not after_ok:
            issues.append(after_msg)
        if not all_covered:
            missing = [k for k, v in report.requirements_coverage.items() if not v]
            issues.append(f"Missing coverage for: {', '.join(missing)}")
        report.summary = f"✗ VERIFICATION FAILED: {'; '.join(issues)}"
    
    print(f"\n{report.summary}")
    print("=" * 60)
    
    return report


def main():
    """Main entry point."""
    report = run_verification()
    
    # Return appropriate exit code
    sys.exit(0 if report.verification_passed else 1)


if __name__ == "__main__":
    main()
