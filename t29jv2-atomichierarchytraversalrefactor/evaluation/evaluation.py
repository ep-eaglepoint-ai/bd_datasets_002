#!/usr/bin/env python3
"""
Evaluation script for hierarchy traversal refactoring.
Runs tests on both repository_before and repository_after and generates a comparison report.
"""

import json
import subprocess
import sys
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
import platform

# Quiet mode: when True, only the final report path is printed to console.
# To enable full console output set environment variable EVALUATION_QUIET=0
QUIET = os.environ.get("EVALUATION_QUIET", "1") != "0"


def log(*args, **kwargs):
    if not QUIET:
        print(*args, **kwargs)


def parse_pytest_output(output: str) -> dict:
    """
    Parse pytest output to extract test results.
    
    Expected format:
    ============================= test session starts ==============================
    ...
    tests/test_hierarchy.py::TestClass::test_name PASSED [ 10%]
    ...
    =================== 3 failed, 12 passed, 1 warning in 0.11s ===================
    """
    test_results = []
    summary = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "xfailed": 0,
        "errors": 0,
        "skipped": 0
    }
    
    # Parse individual test results
    test_pattern = r'tests/.*?::(.*?)::(.*?)\s+(PASSED|FAILED|SKIPPED|ERROR|XFAIL)'
    for match in re.finditer(test_pattern, output):
        class_name = match.group(1)
        test_name = match.group(2)
        status = match.group(3)
        
        test_results.append({
            "class": class_name,
            "name": test_name,
            "status": status.lower(),
            "full_name": f"{class_name}::{test_name}"
        })
    
    # Parse summary line
    summary_pattern = r'(\d+)\s+failed|(\d+)\s+passed|(\d+)\s+skipped|(\d+)\s+xfailed|(\d+)\s+error'
    
    # Extract failed count
    failed_match = re.search(r'(\d+)\s+failed', output)
    if failed_match:
        summary['failed'] = int(failed_match.group(1))
    
    # Extract passed count
    passed_match = re.search(r'(\d+)\s+passed', output)
    if passed_match:
        summary['passed'] = int(passed_match.group(1))
    
    # Extract skipped count
    skipped_match = re.search(r'(\d+)\s+skipped', output)
    if skipped_match:
        summary['skipped'] = int(skipped_match.group(1))
    
    # Extract xfailed count
    xfailed_match = re.search(r'(\d+)\s+xfailed', output)
    if xfailed_match:
        summary['xfailed'] = int(xfailed_match.group(1))
    
    # Extract error count
    error_match = re.search(r'(\d+)\s+error', output)
    if error_match:
        summary['errors'] = int(error_match.group(1))
    
    # Calculate total
    summary['total'] = (summary['passed'] + summary['failed'] + 
                       summary['skipped'] + summary['xfailed'] + summary['errors'])
    
    return {
        "tests": test_results,
        "summary": summary
    }


def run_tests(repo_path: str) -> dict:
    """
    Run pytest on a specific repository.
    Returns dict with success, exit_code, tests, and summary.
    """
    env = os.environ.copy()
    env['REPO_PATH'] = repo_path
    
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pytest', '-v', 'tests', '--tb=short'],
            capture_output=True,
            text=True,
            env=env,
            timeout=120,
            cwd='/app' if os.path.exists('/app') else '.'
        )
        
        output = result.stdout + result.stderr
        parsed = parse_pytest_output(output)
        
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "tests": parsed["tests"],
            "summary": parsed["summary"],
            "output": output
        }
    
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "xfailed": 0,
                "errors": 1,
                "skipped": 0
            },
            "output": "Test execution timed out after 120 seconds"
        }
    
    except Exception as e:
        return {
            "success": False,
            "exit_code": -1,
            "tests": [],
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "xfailed": 0,
                "errors": 1,
                "skipped": 0
            },
            "output": f"Error running tests: {str(e)}"
        }


def generate_report() -> dict:
    """Generate comprehensive evaluation report."""
    run_id = str(uuid.uuid4())
    started_at = datetime.utcnow()
    
    log("🧪 Running tests on repository_before...")
    before_results = run_tests("repository_before")
    
    log("🧪 Running tests on repository_after...")
    after_results = run_tests("repository_after")
    
    finished_at = datetime.utcnow()
    duration = (finished_at - started_at).total_seconds()
    
    # Determine overall success
    # Success = after passes all tests (before is expected to have some failures)
    overall_success = after_results["success"]
    
    # Build comparison
    comparison = {
        "before_tests_passed": before_results["success"],
        "after_tests_passed": after_results["success"],
        "before_total": before_results["summary"]["total"],
        "before_passed": before_results["summary"]["passed"],
        "before_failed": before_results["summary"]["failed"],
        "before_xfailed": before_results["summary"]["xfailed"],
        "before_skipped": before_results["summary"]["skipped"],
        "before_errors": before_results["summary"]["errors"],
        "after_total": after_results["summary"]["total"],
        "after_passed": after_results["summary"]["passed"],
        "after_failed": after_results["summary"]["failed"],
        "after_xfailed": after_results["summary"]["xfailed"],
        "after_skipped": after_results["summary"]["skipped"],
        "after_errors": after_results["summary"]["errors"],
        "improvement": {
            "tests_fixed": before_results["summary"]["failed"] - after_results["summary"]["failed"],
            "features_added": after_results["summary"]["passed"] - before_results["summary"]["passed"]
        }
    }
    
    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat() + "Z",
        "finished_at": finished_at.isoformat() + "Z",
        "duration_seconds": round(duration, 3),
        "success": overall_success,
        "error": None if overall_success else "repository_after has failing tests",
        "environment": {
            "python_version": platform.python_version(),
            "platform": platform.system(),
            "os": platform.platform(),
            "architecture": platform.machine(),
            "hostname": platform.node()
        },
        "results": {
            "before": {
                "success": before_results["success"],
                "exit_code": before_results["exit_code"],
                "tests": before_results["tests"],
                "summary": before_results["summary"]
            },
            "after": {
                "success": after_results["success"],
                "exit_code": after_results["exit_code"],
                "tests": after_results["tests"],
                "summary": after_results["summary"]
            },
            "comparison": comparison
        }
    }
    
    return report


def main():
    """Main execution function."""
    log("=" * 70)
    log("  Hierarchy Traversal Refactoring - Evaluation Report")
    log("=" * 70)
    log()
    
    # Generate report
    report = generate_report()
    
    # Create output directory with date and time
    now = datetime.now()
    output_dir = Path("evaluation") / now.strftime("%Y-%m-%d") / now.strftime("%H-%M-%S")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write report
    report_path = output_dir / "report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    log()
    log("=" * 70)
    log("📊 EVALUATION SUMMARY")
    log("=" * 70)
    log()
    log(f"Repository Before:")
    log(f"  ✓ Passed:  {report['results']['before']['summary']['passed']}")
    log(f"  ✗ Failed:  {report['results']['before']['summary']['failed']}")
    log(f"  ⊘ Skipped: {report['results']['before']['summary']['skipped']}")
    log(f"  Total:     {report['results']['before']['summary']['total']}")
    log()
    log(f"Repository After:")
    log(f"  ✓ Passed:  {report['results']['after']['summary']['passed']}")
    log(f"  ✗ Failed:  {report['results']['after']['summary']['failed']}")
    log(f"  ⊘ Skipped: {report['results']['after']['summary']['skipped']}")
    log(f"  Total:     {report['results']['after']['summary']['total']}")
    log()
    log(f"Improvement:")
    log(f"  Tests Fixed:     {report['results']['comparison']['improvement']['tests_fixed']}")
    log(f"  Features Added:  {report['results']['comparison']['improvement']['features_added']}")
    log()
    log(f"Overall Success: {'✅ PASS' if report['success'] else '❌ FAIL'}")
    log(f"Duration: {report['duration_seconds']}s")
    log()
    print(f"📄 Report saved to: {report_path}")
    log("=" * 70)
    
    # Exit with appropriate code
    sys.exit(0 if report['success'] else 1)


if __name__ == "__main__":
    main()
