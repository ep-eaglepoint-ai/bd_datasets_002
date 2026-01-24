#!/usr/bin/env python3
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


def run_pytest(tests_dir, label, target_repo):
    """
    Run Pytest and parse the JSON output (using pytest-json-report or manual parsing if not installed).
    Since we didn't add pytest-json-report to requirements, we use --junitxml or just parse stdout?
    Use -v to see output, but capturing detail is harder without a plugin.
    
    Actually, passing simple boolean success is enough for the task summary, 
    but for "structured result" we ideally want test counts.
    
    We can use `pytest --junitxml=report.xml` and parse XML.
    Or just rely on return code and regex parsing of stdout summary line "X passed, Y failed".
    Let's use regex parsing on stdout.
    """
    import re
    
    print(f"\n{'=' * 60}")
    print(f"RUNNING TESTS: {label.upper()}")
    print(f"{'=' * 60}")
    
    # Environment
    env = os.environ.copy()
    env["TARGET_REPO"] = target_repo
    
    cmd = ["pytest", "-v", str(tests_dir)]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env,
            timeout=120
        )

        stdout = result.stdout
        stderr = result.stderr
        
        # Parse summary from stdout
        # Example: "5 passed, 1 failed in 0.12s"
        # Or "5 passed in 0.12s"
        # Or "ERRORS"
        
        passed = 0
        failed = 0
        total = 0
        
        # Regex to find summary line at the bottom
        # It's usually the last non-empty line
        lines = stdout.strip().split('\n')
        last_line = lines[-1] if lines else ""
        
        # Pattern for valid run
        # "2 passed, 1 failed in 0.03s"
        # "3 passed in 0.02s"
        match = re.search(r'(?:(\d+) passed)?(?:, )?(?:(\d+) failed)?(?:, )?(?:(\d+) error)?', last_line)
        
        # Robust parsing: scanning the whole output for the summary line might be safer
        # or just relying on return code for "success".
        # Let's try to extract numbers.
        
        passed_match = re.search(r'(\d+) passed', last_line)
        failed_match = re.search(r'(\d+) failed', last_line)
        error_match = re.search(r'(\d+) error', last_line)
        
        if passed_match:
            passed = int(passed_match.group(1))
        if failed_match:
            failed = int(failed_match.group(1))
        if error_match:
             # Treat errors as failed for simplicity or track separate
             failed += int(error_match.group(1))
             
        if not passed_match and not failed_match and result.returncode != 0:
            # Maybe it failed collection or crashed
            if "collected 0 items" in stdout:
                pass
            else:
                # Assume catastrophic failure if return code is non-zero
                # and we couldn't parse normal summary
                failed = 1 # At least
        
        total = passed + failed

        print(stdout)
        
        tests_list = []
        # Parse individual test results from stdout (lines starting with tests/)
        # tests/test_payment.py::TestPaymentProcessing::test_payment_success PASSED [ 20%]
        for line in lines:
            if "::" in line and ("PASSED" in line or "FAILED" in line or "ERROR" in line):
                parts = line.split()
                nodeid = parts[0]
                outcome = parts[1] # PASSED / FAILED / ERROR
                tests_list.append({
                    "nodeid": nodeid,
                    "name": nodeid.split("::")[-1],
                    "outcome": outcome.lower()
                })

        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "tests": tests_list,
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "errors": 0,
                "skipped": 0,
            },
            "stdout": stdout,
            "stderr": stderr,
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


def run_evaluation():
    """
    Run complete evaluation.
    """
    print(f"\n{'=' * 60}")
    print("PASSWORD RESET FUNCTION EVALUATION")
    print(f"{'=' * 60}")
    
    project_root = Path(__file__).parent.parent
    tests_dir = project_root / "tests"
    
    # Run tests with BEFORE implementation
    print(f"\n{'=' * 60}")
    print("RUNNING TESTS: BEFORE (repository_before)")
    print(f"{'=' * 60}")
    
    before_results = run_pytest(
        tests_dir,
        "before (repository_before)",
        "repository_before"
    )
    
    # Run tests with AFTER implementation
    after_results = run_pytest(
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
        "after_total": after_results.get("summary", {}).get("total", 0),
        "after_passed": after_results.get("summary", {}).get("passed", 0),
        "after_failed": after_results.get("summary", {}).get("failed", 0),
    }
    
    # Print summary
    print(f"\n{'=' * 60}")
    print("EVALUATION SUMMARY")
    print(f"{'=' * 60}")
    
    print(f"\nBefore Implementation (repository_before):")
    print(f"  Overall: {'✅ PASSED' if before_results.get('success') else 'Expected Failure'}")
    print(f"  Tests: {comparison['before_passed']}/{comparison['before_total']} passed")
    
    print(f"\nAfter Implementation (repository_after):")
    print(f"  Overall: {'✅ PASSED' if after_results.get('success') else '❌ FAILED'}")
    print(f"  Tests: {comparison['after_passed']}/{comparison['after_total']} passed")
    
    # Determine expected behavior
    print(f"\n{'=' * 60}")
    print("EXPECTED BEHAVIOR CHECK")
    print(f"{'=' * 60}")
    
    success = False
    
    if after_results.get("success"):
        print("✅ After implementation: All tests passed (expected)")
        success = True
    else:
        print("❌ After implementation: Some tests failed (unexpected - should pass all)")
    
    return {
        "before": before_results,
        "after": after_results,
        "comparison": comparison,
        "overall_success": success
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
    
    parser = argparse.ArgumentParser(description="Run evaluation")
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output JSON file path"
    )
    
    args = parser.parse_args()
    
    # Generate run ID and timestamps
    run_id = generate_run_id()
    started_at = datetime.now()
    
    print(f"Run ID: {run_id}")
    print(f"Started at: {started_at.isoformat()}")
    
    try:
        results = run_evaluation()
        success = results["overall_success"]
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
    # If output path is not provided, use default structure
    # BUT user said "report.json it generates its format must be the same" 
    # and generated path is usually fine.
    
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