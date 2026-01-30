"""
Task Manager API - Evaluation Runner and Report Generator

This module handles:
1. Executing all tests (verification tests, meta-tests, Go tests)
2. Generating detailed metrics:
   - Execution time
   - Pass/fail status
   - Error logs
   - Race detection results
3. Producing a structured JSON report

Usage:
    python evaluation/evaluation.py [--output report.json]
"""

import subprocess
import sys
import os
import json
import time
import re
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class TestExecution:
    """Details of a single test execution."""
    test_name: str
    passed: bool
    duration_ms: float
    output: str = ""
    error_message: str = ""


@dataclass
class RepositoryMetrics:
    """Metrics for a single repository."""
    repository_path: str
    build_success: bool
    build_time_seconds: float
    build_error: str = ""
    
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    skipped_tests: int = 0
    
    race_warnings_detected: int = 0
    test_execution_time_seconds: float = 0.0
    
    tests: List[TestExecution] = field(default_factory=list)


@dataclass
class PythonTestMetrics:
    """Metrics for Python test execution."""
    test_file: str
    passed: bool
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    execution_time_seconds: float = 0.0
    output: str = ""
    errors: List[str] = field(default_factory=list)


@dataclass
class EvaluationReport:
    """Complete evaluation report with all metrics."""
    # Metadata
    timestamp: str
    total_execution_time_seconds: float
    go_version: str = ""
    python_version: str = ""
    
    # Overall results
    evaluation_passed: bool = False
    summary: str = ""
    
    # Repository metrics
    repository_before: Optional[RepositoryMetrics] = None
    repository_after: Optional[RepositoryMetrics] = None
    
    # Python test metrics
    verification_tests: Optional[PythonTestMetrics] = None
    meta_tests: Optional[PythonTestMetrics] = None
    
    # Requirements checklist
    requirements_status: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    
    # Error log
    error_log: List[str] = field(default_factory=list)


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent


def get_go_version() -> str:
    """Get Go version string."""
    try:
        result = subprocess.run(
            ["go", "version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return "Go not found"


def get_python_version() -> str:
    """Get Python version string."""
    return f"Python {sys.version}"


def run_command(cmd: List[str], cwd: Path, timeout: int = 300, env: dict = None) -> tuple:
    """Run a command and return (exit_code, stdout, stderr, duration)."""
    start_time = time.time()
    try:
        # Prepare environment
        environ = os.environ.copy()
        if env:
            environ.update(env)

        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=True if sys.platform == "win32" else False,
            env=environ
        )
        duration = time.time() - start_time
        return result.returncode, result.stdout, result.stderr, duration
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out", time.time() - start_time
    except Exception as e:
        return -1, "", str(e), time.time() - start_time


def evaluate_go_repository(repo_path: Path) -> RepositoryMetrics:
    """
    Run Go tests on a repository and collect metrics.
    """
    metrics = RepositoryMetrics(
        repository_path=str(repo_path),
        build_success=False,
        build_time_seconds=0.0
    )
    
    if not repo_path.exists():
        metrics.build_error = "Repository path does not exist"
        return metrics
    
    if not (repo_path / "go.mod").exists():
        metrics.build_error = "go.mod not found - not a Go module"
        return metrics
    
    # Step 1: Build
    print(f"  Building {repo_path.name}...")
    code, stdout, stderr, duration = run_command(
        ["go", "build", "-v", "./..."],
        repo_path
    )
    metrics.build_time_seconds = duration
    
    if code != 0:
        metrics.build_error = stderr or stdout
        metrics.build_success = False
        return metrics
    
    metrics.build_success = True
    
    # Step 2: Run tests with race detector
    print(f"  Running tests with race detector...")
    code, stdout, stderr, duration = run_command(
        ["go", "test", "-race", "-v", "-json", "./..."],
        repo_path,
        timeout=300
    )
    metrics.test_execution_time_seconds = duration
    
    combined_output = stdout + stderr
    
    # Count race warnings
    race_pattern = r"WARNING: DATA RACE|race detected"
    metrics.race_warnings_detected = len(re.findall(race_pattern, combined_output, re.IGNORECASE))
    
    # Parse test results from JSON output
    tests = []
    passed = 0
    failed = 0
    
    for line in stdout.split('\n'):
        if not line.strip():
            continue
        try:
            event = json.loads(line)
            action = event.get('Action')
            test_name = event.get('Test', '')
            
            if action == 'pass' and test_name:
                passed += 1
                tests.append(TestExecution(
                    test_name=test_name,
                    passed=True,
                    duration_ms=event.get('Elapsed', 0) * 1000
                ))
            elif action == 'fail' and test_name:
                failed += 1
                tests.append(TestExecution(
                    test_name=test_name,
                    passed=False,
                    duration_ms=event.get('Elapsed', 0) * 1000,
                    error_message="Test failed"
                ))
        except json.JSONDecodeError:
            pass
    
    # Fallback to regex parsing if JSON didn't work
    if passed == 0 and failed == 0:
        pass_matches = re.findall(r'--- PASS: (\S+)', combined_output)
        fail_matches = re.findall(r'--- FAIL: (\S+)', combined_output)
        
        for name in pass_matches:
            passed += 1
            tests.append(TestExecution(test_name=name, passed=True, duration_ms=0))
        
        for name in fail_matches:
            failed += 1
            tests.append(TestExecution(test_name=name, passed=False, duration_ms=0))
    
    metrics.total_tests = passed + failed
    metrics.passed_tests = passed
    metrics.failed_tests = failed
    metrics.tests = tests
    
    return metrics


def run_python_tests(test_file: Path) -> PythonTestMetrics:
    """
    Run a Python test file and collect metrics.
    """
    metrics = PythonTestMetrics(
        test_file=str(test_file),
        passed=False
    )
    
    if not test_file.exists():
        metrics.errors.append(f"Test file not found: {test_file}")
        return metrics
    
    print(f"  Running {test_file.name}...")
    
    code, stdout, stderr, duration = run_command(
        [sys.executable, "-m", "pytest", str(test_file), "-v", "--tb=short"],
        test_file.parent.parent,
        timeout=120
    )
    
    metrics.execution_time_seconds = duration
    metrics.output = stdout + stderr
    
    # Parse pytest output for counts
    passed_match = re.search(r'(\d+) passed', metrics.output)
    failed_match = re.search(r'(\d+) failed', metrics.output)
    
    if passed_match:
        metrics.passed_tests = int(passed_match.group(1))
    if failed_match:
        metrics.failed_tests = int(failed_match.group(1))
    
    metrics.total_tests = metrics.passed_tests + metrics.failed_tests
    metrics.passed = (code == 0)
    
    if code != 0:
        # Extract error details
        error_matches = re.findall(r'FAILED (.+)', metrics.output)
        metrics.errors.extend(error_matches)
    
    return metrics


def build_requirements_status(after_metrics: RepositoryMetrics) -> Dict[str, Dict[str, Any]]:
    """
    Build a status report for each of the 16 requirements.
    """
    requirements = {
        1: "All operations must be safe under concurrent load",
        2: "Must pass Go race detector with zero warnings",
        3: "No unbounded goroutines or channel deadlocks",
        4: "Each task must have a unique ID",
        5: "Title and description cannot be empty",
        6: "Status must be exactly 'Pending', 'In Progress', or 'Completed'",
        7: "Due dates must be realistic (>= Jan 1, 2000 and <= 10 years from now)",
        8: "Deleted tasks must be fully removed from memory, never reappear",
        9: "POST /tasks returns full task object",
        10: "PUT /tasks/:id returns updated full task object",
        11: "GET endpoints must return consistent results, no phantom or duplicate tasks",
        12: "All lookups and updates must maintain consistent response times",
        13: "Memory usage must remain stable under sustained operations",
        14: "No O(n²) complexity in critical paths",
        15: "In-memory storage only; no external DB",
        16: "Cannot change HTTP paths, methods, or JSON field names"
    }
    
    status = {}
    for num, description in requirements.items():
        test_name = f"TestRequirement{num}_"
        
        # Find matching tests
        matching_tests = [t for t in after_metrics.tests if test_name in t.test_name]
        
        if matching_tests:
            all_passed = all(t.passed for t in matching_tests)
            status[f"Requirement {num}"] = {
                "description": description,
                "tested": True,
                "passed": all_passed,
                "test_names": [t.test_name for t in matching_tests]
            }
        else:
            status[f"Requirement {num}"] = {
                "description": description,
                "tested": False,
                "passed": False,
                "test_names": []
            }
    
    return status


def generate_report(output_path: Path) -> EvaluationReport:
    """
    Generate the complete evaluation report.
    """
    start_time = time.time()
    project_root = get_project_root()
    
    report = EvaluationReport(
        timestamp=datetime.now().isoformat(),
        total_execution_time_seconds=0.0,
        go_version=get_go_version(),
        python_version=get_python_version()
    )
    
    print("=" * 60)
    print("TASK MANAGER API - EVALUATION RUNNER")
    print("=" * 60)
    print(f"Timestamp: {report.timestamp}")
    print(f"Go: {report.go_version}")
    print()
    
    # Evaluate repositories
    print("[1/4] Evaluating repository_before...")
    before_path = project_root / "repository_before"
    report.repository_before = evaluate_go_repository(before_path)
    print(f"  Build: {'✓' if report.repository_before.build_success else '✗'}")
    print(f"  Tests: {report.repository_before.passed_tests}/{report.repository_before.total_tests} passed")
    print(f"  Race warnings: {report.repository_before.race_warnings_detected}")
    
    print("\n[2/4] Evaluating repository_after...")
    after_path = project_root / "repository_after"
    report.repository_after = evaluate_go_repository(after_path)
    print(f"  Build: {'✓' if report.repository_after.build_success else '✗'}")
    print(f"  Tests: {report.repository_after.passed_tests}/{report.repository_after.total_tests} passed")
    print(f"  Race warnings: {report.repository_after.race_warnings_detected}")
    
    # Run Python verification tests
    print("\n[3/4] Running verification tests...")
    verification_test = project_root / "tests" / "test_verification.py"
    report.verification_tests = run_python_tests(verification_test)
    print(f"  Result: {'✓ PASSED' if report.verification_tests.passed else '✗ FAILED'}")
    
    print("\n[4/4] Running meta-tests...")
    meta_test = project_root / "tests" / "test_meta.py"
    report.meta_tests = run_python_tests(meta_test)
    print(f"  Result: {'✓ PASSED' if report.meta_tests.passed else '✗ FAILED'}")
    
    # Build requirements status
    if report.repository_after:
        report.requirements_status = build_requirements_status(report.repository_after)
    
    # Determine overall evaluation result
    after_ok = (
        report.repository_after and
        report.repository_after.build_success and
        report.repository_after.race_warnings_detected == 0 and
        report.repository_after.failed_tests == 0
    )
    
    meta_ok = report.meta_tests and report.meta_tests.passed
    
    all_requirements_passed = all(
        r.get('passed', False) 
        for r in report.requirements_status.values()
    ) if report.requirements_status else False
    
    report.evaluation_passed = after_ok and all_requirements_passed
    
    if report.evaluation_passed:
        report.summary = "✓ EVALUATION PASSED: All tests pass, no race conditions, all requirements met"
    else:
        issues = []
        if not report.repository_after.build_success:
            issues.append("Build failed")
        if report.repository_after.race_warnings_detected > 0:
            issues.append(f"{report.repository_after.race_warnings_detected} race warnings")
        if report.repository_after.failed_tests > 0:
            issues.append(f"{report.repository_after.failed_tests} tests failed")
        if not all_requirements_passed:
            failed_reqs = [k for k, v in report.requirements_status.items() if not v.get('passed')]
            issues.append(f"Requirements not met: {', '.join(failed_reqs)}")
        report.summary = f"✗ EVALUATION FAILED: {'; '.join(issues)}"
    
    report.total_execution_time_seconds = time.time() - start_time
    
    # Save report
    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print(report.summary)
    print(f"Total execution time: {report.total_execution_time_seconds:.2f}s")
    
    # Convert to serializable dict
    def to_dict(obj):
        if hasattr(obj, '__dataclass_fields__'):
            return {k: to_dict(v) for k, v in asdict(obj).items()}
        elif isinstance(obj, list):
            return [to_dict(i) for i in obj]
        elif isinstance(obj, dict):
            return {k: to_dict(v) for k, v in obj.items()}
        else:
            return obj
    
    report_dict = to_dict(report)
    
    # Save to JSON file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(report_dict, f, indent=2)
    
    print(f"\nReport saved to: {output_path}")

    # FORCE PRINT TO STDOUT FOR CI CAPTURE
    print("\n=== REPORT JSON START ===")
    print(json.dumps(report_dict, indent=2))
    print("=== REPORT JSON END ===")

    if not report.evaluation_passed:
        print("\nEvaluation FAILED")
    
    return report


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Task Manager API Evaluation Runner"
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default="evaluation/report.json",
        help="Output path for metrics JSON file"
    )
    
    args = parser.parse_args()
    
    project_root = get_project_root()
    output_path = project_root / args.output
    
    report = generate_report(output_path)
    
    # Exit with appropriate code
    sys.exit(0 if report.evaluation_passed else 1)


if __name__ == "__main__":
    main()
