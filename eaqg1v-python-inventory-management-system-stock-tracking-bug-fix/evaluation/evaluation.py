import os
import sys
import json
import uuid
import platform
import subprocess
import re
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


def run_pytest_with_pythonpath(pythonpath, tests_dir, label):
    """
    Run pytest on the tests/ folder with specific PYTHONPATH.
    
    Args:
        pythonpath: The PYTHONPATH to use for the tests
        tests_dir: Path to the tests directory
        label: Label for this test run (e.g., "before", "after")
    
    Returns:
        dict with test results
    """
    print(f"\n{'=' * 60}")
    print(f"RUNNING TESTS: {label.upper()}")
    print(f"{'=' * 60}")
    print(f"PYTHONPATH: {pythonpath}")
    print(f"Tests directory: {tests_dir}")
    
    # Build pytest command
    cmd = [
        sys.executable, "-m", "pytest",
        str(tests_dir),
        "-v",
        "--tb=short",
    ]
    
    env = os.environ.copy()
    env["PYTHONPATH"] = pythonpath
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(Path(tests_dir).parent),
            env=env,
            timeout=180
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
            "stdout": stdout[-3000:] if len(stdout) > 3000 else stdout,
            "stderr": stderr[-1000:] if len(stderr) > 1000 else stderr,
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
    
    # Pattern to match test results like:
    # tests/test_file.py::test_name PASSED [  XX%]
    # tests/test_file.py::test_name FAILED
    # Handle variable spacing
    test_pattern = re.compile(
        r'^([^:]+::[^\s]+)\s+(PASSED|FAILED|ERROR|SKIPPED)(?:\s+\[.*?\])?$'
    )
    
    for line in lines:
        line_stripped = line.strip()
        
        # Skip empty lines and summary lines
        if not line_stripped or 'test session starts' in line_stripped or 'collected' in line_stripped or 'passed in' in line_stripped or 'failed in' in line_stripped:
            continue
        
        # Try regex match first (more reliable)
        match = test_pattern.match(line_stripped)
        if match:
            nodeid = match.group(1).strip()
            status = match.group(2).strip()
            
            outcome_map = {
                "PASSED": "passed",
                "FAILED": "failed",
                "ERROR": "error",
                "SKIPPED": "skipped"
            }
            outcome = outcome_map.get(status, "unknown")
            
            # Extract test name (last part after ::)
            test_name = nodeid.split("::")[-1] if "::" in nodeid else nodeid
            
            tests.append({
                "nodeid": nodeid,
                "name": test_name,
                "outcome": outcome,
            })
            continue
        
        # Fallback: original parsing logic for edge cases
        if '::' in line_stripped:
            outcome = None
            status_word = None
            
            # Check for status words (handle variable spacing)
            if re.search(r'\s+PASSED\s+\[', line_stripped) or line_stripped.endswith(' PASSED'):
                outcome = "passed"
                status_word = ' PASSED'
            elif re.search(r'\s+FAILED\s+\[', line_stripped) or line_stripped.endswith(' FAILED'):
                outcome = "failed"
                status_word = ' FAILED'
            elif re.search(r'\s+ERROR\s+\[', line_stripped) or line_stripped.endswith(' ERROR'):
                outcome = "error"
                status_word = ' ERROR'
            elif re.search(r'\s+SKIPPED\s+\[', line_stripped) or line_stripped.endswith(' SKIPPED'):
                outcome = "skipped"
                status_word = ' SKIPPED'
            
            if outcome and status_word:
                # Extract nodeid (everything before the status)
                # Handle both "PASSED" and "PASSED [XX%]" formats with variable spacing
                if re.search(rf'{re.escape(status_word)}\s+\[', line_stripped):
                    # Split on status word followed by [
                    parts = re.split(rf'{re.escape(status_word)}\s+\[', line_stripped, 1)
                    nodeid = parts[0].strip()
                else:
                    nodeid = line_stripped.split(status_word)[0].strip()
                
                # Extract test name (last part after ::)
                test_name = nodeid.split("::")[-1] if "::" in nodeid else nodeid
                
                tests.append({
                    "nodeid": nodeid,
                    "name": test_name,
                    "outcome": outcome,
                })
    
    return tests


def run_evaluation():
    """
    Run complete evaluation for both implementations.
    
    Returns dict with test results from both before and after implementations.
    """
    print(f"\n{'=' * 60}")
    print("INVENTORY BUG FIX EVALUATION")
    print(f"{'=' * 60}")
    
    project_root = Path(__file__).parent.parent
    tests_dir = project_root / "tests"
    
    # PYTHONPATH for before implementation
    before_pythonpath = str(project_root / "repository_before")
    
    # PYTHONPATH for after implementation  
    after_pythonpath = str(project_root / "repository_after")
    
    # Run tests with BEFORE implementation
    before_results = run_pytest_with_pythonpath(
        before_pythonpath,
        tests_dir,
        "before (repository_before)"
    )
    
    # Run tests with AFTER implementation
    after_results = run_pytest_with_pythonpath(
        after_pythonpath,
        tests_dir,
        "after (repository_after)"
    )
    
    # Build comparison
    comparison = {
        "before_tests_passed": before_results.get("success", False),
        "after_tests_passed": after_results.get("success", False),
        "before_total": before_results.get("summary", {}).get("total", 0),
        "before_passed": before_results.get("summary", {}).get("passed", 0),
        "before_failed": before_results.get("summary", {}).get("failed", 0),
        "after_total": after_results.get("summary", {}).get("total", 0),
        "after_passed": after_results.get("summary", {}).get("passed", 0),
        "after_failed": after_results.get("summary", {}).get("failed", 0),
    }
    
    # Print summary
    print(f"\n{'=' * 60}")
    print("EVALUATION SUMMARY")
    print(f"{'=' * 60}")
    
    print(f"\nBefore Implementation (repository_before):")
    print(f"  Overall: {'✅ PASSED' if before_results.get('success') else '❌ FAILED'}")
    print(f"  Tests: {comparison['before_passed']}/{comparison['before_total']} passed")
    
    print(f"\nAfter Implementation (repository_after):")
    print(f"  Overall: {'✅ PASSED' if after_results.get('success') else '❌ FAILED'}")
    print(f"  Tests: {comparison['after_passed']}/{comparison['after_total']} passed")
    
    # Determine expected behavior
    print(f"\n{'=' * 60}")
    print("EXPECTED BEHAVIOR CHECK")
    print(f"{'=' * 60}")
    
    # Before: Some tests should fail (it's the buggy version)
    # After: All tests should pass (it's the fixed version)
    before_expected_failures = comparison['before_failed'] > 0
    after_all_passed = after_results.get("success", False)
    
    if before_expected_failures:
        print("✅ Before implementation: Some tests failed (expected - it's the buggy version)")
    else:
        print("⚠️  Before implementation: All tests passed (unexpected - should have some failures)")
    
    if after_all_passed:
        print("✅ After implementation: All tests passed (expected - it's the fixed version)")
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
    
    parser = argparse.ArgumentParser(description="Run inventory bug fix evaluation")
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
