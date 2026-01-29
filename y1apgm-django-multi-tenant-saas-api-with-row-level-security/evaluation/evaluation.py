#!/usr/bin/env python3
"""
Evaluation script for multi-tenant Django SaaS API.

Runs pytest tests against both repository_before and repository_after
and generates a comprehensive comparison report.
"""
import os
import sys
import json
import uuid
import platform
import subprocess
from datetime import datetime
from pathlib import Path


def generate_run_id():
    """Generate a short unique run ID."""
    return uuid.uuid4().hex[:8]


def get_git_info():
    """Get git commit and branch information."""
    git_info = {"git_commit": "unknown", "git_branch": "unknown"}
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            git_info["git_commit"] = result.stdout.strip()[:8]
    except Exception:
        pass

    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            git_info["git_branch"] = result.stdout.strip()
    except Exception:
        pass

    return git_info


def get_environment_info():
    """Collect environment information for the report."""
    git_info = get_git_info()

    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "os": platform.system(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "hostname": platform.node(),
        "git_commit": git_info["git_commit"],
        "git_branch": git_info["git_branch"],
    }


def run_pytest_with_pythonpath(pythonpath, tests_dir, label, target_repo):
    """
    Run pytest on the tests/ folder with specific PYTHONPATH.

    Args:
        pythonpath: The PYTHONPATH to use for the tests
        tests_dir: Path to the tests directory
        label: Label for this test run (e.g., "before", "after")
        target_repo: The target repository name (e.g., "repository_before", "repository_after")

    Returns:
        dict with test results
    """
    print(f"\n{'=' * 60}")
    print(f"RUNNING TESTS: {label.upper()}")
    print(f"{'=' * 60}")
    print(f"PYTHONPATH: {pythonpath}")
    print(f"TARGET_REPOSITORY: {target_repo}")
    print(f"Tests directory: {tests_dir}")

    # Build pytest command with Django test settings
    cmd = [
        sys.executable, "-m", "pytest",
        str(tests_dir),
        "-v",
        "--tb=short",
        f"--ds=test_settings",
    ]

    env = os.environ.copy()
    # PYTHONPATH includes both the target repository and the project root
    env["PYTHONPATH"] = f"{pythonpath}:{Path(pythonpath).parent}"
    env["TARGET_REPOSITORY"] = target_repo
    env["DJANGO_SETTINGS_MODULE"] = "test_settings"

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=pythonpath,  # Run from the target repository directory
            env=env,
            timeout=300  # Increased timeout for comprehensive tests
        )

        stdout = result.stdout
        stderr = result.stderr

        # Parse verbose output to get test results
        tests = parse_pytest_verbose_output(stdout)

        # Count results
        passed = sum(1 for t in tests if t.get("outcome") == "passed")
        failed = sum(1 for t in tests if t.get("outcome") == "failed")
        errors = sum(1 for t in tests if t.get("outcome") == "error")
        skipped = sum(1 for t in tests if t.get("outcome") == "skipped")
        total = len(tests)

        print(f"\nResults: {passed} passed, {failed} failed, {errors} errors, {skipped} skipped (total: {total})")

        # Print individual test results
        for test in tests:
            status_icon = {
                "passed": "✅",
                "failed": "❌",
                "error": "💥",
                "skipped": "⏭️"
            }.get(test.get("outcome"), "❓")
            print(f"  {status_icon} {test.get('nodeid', 'unknown')}: {test.get('outcome', 'unknown')}")
        
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "tests": tests,
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "skipped": skipped,
            },
            "stdout": stdout[-5000:] if len(stdout) > 5000 else stdout,
            "stderr": stderr[-2000:] if len(stderr) > 2000 else stderr,
        }
        
    except subprocess.TimeoutExpired:
        print("❌ Test execution timed out")
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"error": "Test execution timed out"},
            "stdout": "",
            "stderr": "",
        }
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {"error": str(e)},
            "stdout": "",
            "stderr": "",
        }


def parse_pytest_verbose_output(output):
    """Parse pytest verbose output to extract test results."""
    tests = []
    lines = output.split('\n')
    
    for line in lines:
        line_stripped = line.strip()
        
        # Match lines like: tests/test_before.py::test_before_matches_reference_vectors PASSED
        if '::' in line_stripped:
            outcome = None
            if ' PASSED' in line_stripped:
                outcome = "passed"
            elif ' FAILED' in line_stripped:
                outcome = "failed"
            elif ' ERROR' in line_stripped:
                outcome = "error"
            elif ' SKIPPED' in line_stripped:
                outcome = "skipped"
            
            if outcome:
                # Extract nodeid (everything before the status)
                for status_word in [' PASSED', ' FAILED', ' ERROR', ' SKIPPED']:
                    if status_word in line_stripped:
                        nodeid = line_stripped.split(status_word)[0].strip()
                        break
                
                tests.append({
                    "nodeid": nodeid,
                    "name": nodeid.split("::")[-1] if "::" in nodeid else nodeid,
                    "outcome": outcome,
                })
    
    return tests


def run_evaluation():
    """
    Run complete evaluation for both implementations.
    
    Returns dict with test results from both before and after implementations.
    """
    print(f"\n{'=' * 60}")
    print("MULTI-TENANT DJANGO SAAS API EVALUATION")
    print(f"{'=' * 60}")
    
    project_root = Path(__file__).parent.parent
    tests_dir = project_root / "tests"
    
    # Paths for before and after repositories
    before_path = str(project_root / "repository_before")
    after_path = str(project_root / "repository_after")
    
    print(f"Project root: {project_root}")
    print(f"Tests directory: {tests_dir}")
    print(f"Before path: {before_path}")
    print(f"After path: {after_path}")
    
    # Run tests with BEFORE implementation
    before_results = run_pytest_with_pythonpath(
        before_path,
        tests_dir,
        "before (repository_before)",
        "repository_before"
    )
    
    # Run tests with AFTER implementation
    after_results = run_pytest_with_pythonpath(
        after_path,
        tests_dir,
        "after (repository_after)",
        "repository_after"
    )
    
    # Build comparison
    comparison = {
        "before_tests_passed": before_results.get("success", False),
        "after_tests_passed": after_results.get("success", False),
        "before_total": before_results.get("summary", {}).get("total", 0),
        "before_passed": before_results.get("summary", {}).get("passed", 0),
        "before_failed": before_results.get("summary", {}).get("failed", 0),
        "before_errors": before_results.get("summary", {}).get("errors", 0),
        "after_total": after_results.get("summary", {}).get("total", 0),
        "after_passed": after_results.get("summary", {}).get("passed", 0),
        "after_failed": after_results.get("summary", {}).get("failed", 0),
        "after_errors": after_results.get("summary", {}).get("errors", 0),
    }
    
    # Calculate improvement
    if comparison["before_total"] > 0:
        comparison["improvement"] = comparison["after_passed"] - comparison["before_passed"]
        comparison["improvement_percentage"] = round(
            (comparison["after_passed"] / comparison["after_total"] * 100) - 
            (comparison["before_passed"] / comparison["before_total"] * 100), 2
        )
    
    # Print summary
    print(f"\n{'=' * 60}")
    print("EVALUATION SUMMARY")
    print(f"{'=' * 60}")
    
    print(f"\nBefore Implementation (repository_before):")
    print(f"  Overall: {'✅ PASSED' if before_results.get('success') else '❌ FAILED'}")
    print(f"  Tests: {comparison['before_passed']}/{comparison['before_total']} passed, {comparison['before_failed']} failed, {comparison['before_errors']} errors")
    
    print(f"\nAfter Implementation (repository_after):")
    print(f"  Overall: {'✅ PASSED' if after_results.get('success') else '❌ FAILED'}")
    print(f"  Tests: {comparison['after_passed']}/{comparison['after_total']} passed, {comparison['after_failed']} failed, {comparison['after_errors']} errors")
    
    if "improvement" in comparison:
        print(f"\nImprovement: +{comparison['improvement']} tests passing ({comparison['improvement_percentage']}% improvement)")
    
    # Determine expected behavior
    print(f"\n{'=' * 60}")
    print("EXPECTED BEHAVIOR CHECK")
    print(f"{'=' * 60}")
    
    # Before: should fail (has bugs)
    # After: should pass (bugs fixed)
    if not before_results.get("success"):
        print("✅ Before implementation: Tests failed (expected - has bugs)")
    else:
        print("⚠️  Before implementation: All tests passed (unexpected)")
    
    if after_results.get("success"):
        print("✅ After implementation: All tests passed (expected - bugs fixed)")
    else:
        print("❌ After implementation: Some tests failed (unexpected - should pass all)")
    
    return {
        "before": before_results,
        "after": after_results,
        "comparison": comparison,
    }


def generate_output_path():
    """Generate output path in format: evaluation/YYYY-MM-DD/HH-MM-SS/report.json"""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    
    project_root = Path(__file__).parent.parent
    output_dir = project_root / "evaluation" / date_str / time_str
    output_dir.mkdir(parents=True, exist_ok=True)
    
    return output_dir / "report.json"


def main():
    """Main entry point for evaluation."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run multi-tenant Django API evaluation")
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output JSON file path (default: evaluation/YYYY-MM-DD/HH-MM-SS/report.json)"
    )
    
    args = parser.parse_args()
    
    # Generate run ID and timestamps
    run_id = generate_run_id()
    started_at = datetime.now()
    
    print(f"Run ID: {run_id}")
    print(f"Started at: {started_at.isoformat()}")
    
    try:
        results = run_evaluation()
        
        # Success if after implementation passes all tests
        success = results["after"].get("success", False)
        error_message = None if success else "After implementation tests failed"

    except Exception as e:
        import traceback
        print(f"\nERROR: {str(e)}")
        traceback.print_exc()
        results = None
        success = False
        error_message = str(e)

    finished_at = datetime.now()
    duration = (finished_at - started_at).total_seconds()

    # Collect environment information
    environment = get_environment_info()

    # Build report
    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 6),
        "success": success,
        "error": error_message,
        "environment": environment,
        "results": results,
    }

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = generate_output_path()

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n✅ Report saved to: {output_path}")

    print(f"\n{'=' * 60}")
    print(f"EVALUATION COMPLETE")
    print(f"{'=' * 60}")
    print(f"Run ID: {run_id}")
    print(f"Duration: {duration:.2f}s")
    print(f"Success: {'✅ YES' if success else '❌ NO'}")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())