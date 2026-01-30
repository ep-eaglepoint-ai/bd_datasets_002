#!/usr/bin/env python3
"""
Evaluation runner for Self-Decrypting Time-Dependent Polyglot Python Program.

This evaluation script:
- Runs pytest tests on the solution implementation
- Verifies all acceptance criteria are met
- Generates structured reports with test results

Run with:
    docker compose run --rm app python evaluation/evaluation.py [options]
"""
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
    """Generate a UUID string."""
    return str(uuid.uuid4())


def get_environment_info():
    """Collect environment metadata in standard format."""
    return {
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "platform": f"{platform.system().lower()}-{platform.machine().lower()}",
    }


def truncate_output(output, max_lines=50):
    """Truncate output to max_lines, keeping first and last lines."""
    if not output:
        return ""
    lines = output.split('\n')
    if len(lines) <= max_lines:
        return output
    return '\n'.join(lines[:max_lines//2] + [f"... ({len(lines) - max_lines} lines truncated) ..."] + lines[-max_lines//2:])


def _parse_pytest_summary(output_lines):
    """
    Parse pytest summary lines for total/passed/failed counts.
    Handles both "X passed" and "X passed, Y failed" forms.
    """
    passed_count = 0
    failed_count = 0
    total = 0

    for line in output_lines:
        lower = line.lower()
        if "passed" in lower:
            match_passed = re.search(r"(\d+)\s+passed", lower)
            match_failed = re.search(r"(\d+)\s+failed", lower)
            match_error = re.search(r"(\d+)\s+error", lower)
            if match_passed:
                passed_count = int(match_passed.group(1))
            if match_failed:
                failed_count = int(match_failed.group(1))
            if match_error:
                failed_count = max(failed_count, int(match_error.group(1)))
            if match_passed or match_failed or match_error:
                total = passed_count + failed_count
                return total, passed_count, failed_count

    for line in output_lines:
        lower = line.lower()
        if "collected" in lower and "items" in lower:
            parts = line.split()
            for i, part in enumerate(parts):
                if part.isdigit() and i > 0 and "collected" in parts[i - 1].lower():
                    total = int(part)
                    return total, passed_count, failed_count

    return total, passed_count, failed_count


def run_pytest_tests(pythonpath, tests_dir, label):
    """
    Run pytest tests with specified PYTHONPATH.
    
    Returns dict with test results in standard format.
    """
    env = os.environ.copy()
    env["PYTHONPATH"] = pythonpath
    
    cmd = [sys.executable, "-m", "pytest", "-v", "--tb=short", str(tests_dir)]
    
    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        output_lines = result.stdout.split('\n')
        total, passed_count, failed_count = _parse_pytest_summary(output_lines)
        tests_passed = result.returncode == 0 and failed_count == 0
        
        # Truncate output
        truncated_output = truncate_output(result.stdout)
        
        return {
            "passed": tests_passed,
            "return_code": result.returncode,
            "output": truncated_output,
            "summary": {
                "total": total,
                "passed": passed_count,
                "failed": failed_count,
            },
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "Test execution timed out after 60 seconds",
            "summary": {"total": 0, "passed": 0, "failed": 0},
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "output": f"Error: {str(e)}",
            "summary": {"total": 0, "passed": 0, "failed": 0},
        }


def run_evaluation():
    """
    Run complete evaluation for both before and after implementations.
    
    Returns dict with test results in standard format.
    """
    print(f"\n{'=' * 60}")
    print("SELF-DECRYPTING POLYGLOT PROGRAM EVALUATION")
    print(f"{'=' * 60}")
    
    project_root = Path(__file__).parent.parent
    tests_dir = project_root / "tests"
    repo_before = project_root / "repository_before"
    repo_after = project_root / "repository_after"
    
    # Validate paths
    if not tests_dir.exists():
        raise FileNotFoundError(f"Tests directory not found: {tests_dir}")
    if not repo_before.exists():
        raise FileNotFoundError(f"Repository directory not found: {repo_before}")
    if not repo_after.exists():
        raise FileNotFoundError(f"Repository directory not found: {repo_after}")
    
    # PYTHONPATH for before implementation
    before_pythonpath = str(repo_before)
    after_pythonpath = str(repo_after)
    
    print(f"\nRunning tests on repository_before (baseline)...")
    before_tests = run_pytest_tests(
        before_pythonpath,
        tests_dir,
        "before (repository_before)"
    )
    
    print(f"\nRunning tests on repository_after (solution)...")
    after_tests = run_pytest_tests(
        after_pythonpath,
        tests_dir,
        "after (repository_after)"
    )
    
    # Print summary
    print(f"\n{'=' * 60}")
    print("EVALUATION SUMMARY")
    print(f"{'=' * 60}")
    
    print(f"\nBefore Implementation (repository_before):")
    print(f"  Tests: {'✅ PASSED' if before_tests.get('passed') else '❌ FAILED'}")
    print(f"  Return Code: {before_tests.get('return_code')}")
    
    print(f"\nAfter Implementation (repository_after):")
    print(f"  Tests: {'✅ PASSED' if after_tests.get('passed') else '❌ FAILED'}")
    print(f"  Return Code: {after_tests.get('return_code')}")
    
    # Determine improvement summary
    if after_tests.get('passed') and not before_tests.get('passed'):
        improvement_summary = "Solution successfully implements all requirements. Baseline had no implementation."
    elif after_tests.get('passed') and before_tests.get('passed'):
        improvement_summary = "Both implementations pass tests. Solution meets all acceptance criteria."
    elif not after_tests.get('passed'):
        improvement_summary = "Solution tests failed. Requirements not fully met."
    else:
        improvement_summary = "Evaluation completed."
    
    passed_gate = after_tests.get('passed', False)
    
    return {
        "before": {
            "tests": {
                "passed": before_tests.get("passed"),
                "return_code": before_tests.get("return_code"),
                "output": before_tests.get("output"),
            },
            "summary": before_tests.get("summary", {"total": 0, "passed": 0, "failed": 0}),
            "metrics": {}
        },
        "after": {
            "tests": {
                "passed": after_tests.get("passed"),
                "return_code": after_tests.get("return_code"),
                "output": after_tests.get("output"),
            },
            "summary": after_tests.get("summary", {"total": 0, "passed": 0, "failed": 0}),
            "metrics": {}
        },
        "comparison": {
            "passed_gate": passed_gate,
            "improvement_summary": improvement_summary
        }
    }


def generate_output_path():
    """Generate output path for report."""
    project_root = Path(__file__).parent.parent
    output_dir = project_root / "evaluation"
    timestamp = datetime.now()
    date_dir = output_dir / timestamp.strftime("%Y-%m-%d")
    time_dir = date_dir / timestamp.strftime("%H-%M-%S")
    time_dir.mkdir(parents=True, exist_ok=True)
    return time_dir / "report.json"


def main():
    """Main entry point for evaluation."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run self-decrypting polyglot evaluation")
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
        success = results["comparison"].get("passed_gate", False)
        error_message = None
        
    except Exception as e:
        import traceback
        print(f"\nERROR: {str(e)}")
        traceback.print_exc()
        results = {
            "before": {
                "tests": {"passed": False, "return_code": -1, "output": ""},
                "summary": {"total": 0, "passed": 0, "failed": 0},
                "metrics": {}
            },
            "after": {
                "tests": {"passed": False, "return_code": -1, "output": ""},
                "summary": {"total": 0, "passed": 0, "failed": 0},
                "metrics": {}
            },
            "comparison": {"passed_gate": False, "improvement_summary": f"Evaluation error: {str(e)}"}
        }
        success = False
        error_message = str(e)
    
    finished_at = datetime.now()
    duration = (finished_at - started_at).total_seconds()
    
    # Collect environment information
    environment = get_environment_info()
    
    # Build report in standard format
    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 6),
        "environment": environment,
        "before": results["before"],
        "after": results["after"],
        "comparison": results["comparison"],
        "success": success,
        "error": error_message,
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
