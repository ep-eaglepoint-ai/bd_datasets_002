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


def run_jest_tests(tests_dir, label, target_repo):
    """
    Run Jest tests and parse the JSON output.
    """
    print(f"\n{'=' * 60}")
    print(f"RUNNING TESTS: {label.upper()}")
    print(f"{'=' * 60}")
    print(f"Tests directory: {tests_dir}")

    # Build jest command with JSON output
    # using npx jest directly to avoid npm preamble affecting JSON parsing
    cmd = ["npx", "jest", "--json", "--runInBand", "--forceExit"]
    
    # Environment
    env = os.environ.copy()
    env["TARGET_REPO"] = target_repo
    env["WEBHOOK_SECRET"] = os.environ.get("WEBHOOK_SECRET", "test-secret")

    try:
        # Run jest and capture output
        # Jest prints JSON to stdout (or output file if specified, usually stdout with --json)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(tests_dir),
            env=env,
            timeout=120
        )

        stdout = result.stdout
        stderr = result.stderr
        
        # Try to parse the JSON output
        try:
            jest_data = json.loads(stdout)
            
            # Count results
            passed = jest_data.get("numPassedTests", 0)
            failed = jest_data.get("numFailedTests", 0)
            total = jest_data.get("numTotalTests", 0)
            # Jest doesn't explicitly separate errors from failed in the summary counts usually
            
            # Parse individual test results
            tests = []
            for test_file in jest_data.get("testResults", []):
                for assertion in test_file.get("assertionResults", []):
                     # status can be 'passed', 'failed'
                     status = assertion.get("status")
                     name = assertion.get("title")
                     ancestor = assertion.get("ancestorTitles", [])
                     full_name = " > ".join(ancestor + [name])
                     
                     tests.append({
                         "nodeid": full_name,
                         "name": name,
                         "outcome": status
                     })

            print(f"\nResults: {passed} passed, {failed} failed (total: {total})")
            
            # Print individual test results
            for test in tests:
                status_icon = "✅" if test.get("outcome") == "passed" else "❌"
                print(f"  {status_icon} {test.get('nodeid', 'unknown')}")

            return {
                "success": result.returncode == 0,
                "exit_code": result.returncode,
                "tests": tests,
                "summary": {
                    "total": total,
                    "passed": passed,
                    "failed": failed,
                    "errors": 0,
                    "skipped": jest_data.get("numPendingTests", 0),
                },
                "stdout": stdout[-3000:] if len(stdout) > 3000 else stdout,
                "stderr": stderr[-1000:] if len(stderr) > 1000 else stderr,
            }

        except (json.JSONDecodeError, Exception) as e:
             print(f"❌ Failed to parse Jest JSON output: {e}")
             # print("STDOUT snippet:", stdout[:500])
             # Check if stdout contains "numTotalTests" but failed to parse as pure JSON
             # This happens if there is extra output. We rely on finding JSON boundaries if needed
             # but keeping it simple for now as --json usually outputs valid JSON at the end or strictly.
             return {
                "success": False,
                "exit_code": result.returncode,
                "tests": [],
                "summary": {"error": "Failed to parse Jest output"},
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
    print("Three Mens Morris EVALUATION")
    print(f"{'=' * 60}")
    
    project_root = Path(__file__).parent.parent
    tests_dir = project_root / "tests"
    
    # Run tests with BEFORE implementation
    print(f"\n{'=' * 60}")
    print("RUNNING TESTS: BEFORE (repository_before)")
    print(f"{'=' * 60}")
    
    before_results = run_jest_tests(
        tests_dir,
        "before (repository_before)",
        "repository_before"
    )
    
    # Run tests with AFTER implementation using Jest
    after_results = run_jest_tests(
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
    print(f"  Overall: {'✅ PASSED' if before_results.get('success') else '⏭️ SKIPPED/FAILED'}")
    print(f"  Tests: {comparison['before_passed']}/{comparison['before_total']} passed")
    
    print(f"\nAfter Implementation (repository_after):")
    print(f"  Overall: {'✅ PASSED' if after_results.get('success') else '❌ FAILED'}")
    print(f"  Tests: {comparison['after_passed']}/{comparison['after_total']} passed")
    
    # Determine expected behavior
    print(f"\n{'=' * 60}")
    print("EXPECTED BEHAVIOR CHECK")
    print(f"{'=' * 60}")
    
    if after_results.get("success"):
        print("✅ After implementation: All tests passed (expected)")
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
    
    parser = argparse.ArgumentParser(description="Run mechanical refactor evaluation")
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