#!/usr/bin/env python3
"""
Evaluation runner for TechVision Pro Responsive Design.

This evaluation script:
- Runs pytest/playwright tests on the tests/ folder
- Compares repository_before (baseline) and repository_after (refactored)
- Generates structured reports with environment metadata
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


def run_pytest(tests_path, label, target_dir):
    """
    Run pytest on the specified path with a target directory.
    """
    print(f"\n{'=' * 60}")
    print(f"RUNNING TESTS: {label.upper()} ({target_dir})")
    print(f"{'=' * 60}")
    
    # Build pytest command
    cmd = [
        sys.executable, "-m", "pytest",
        str(tests_path),
        "-v",
        "--tb=short",
    ]
    
    env = os.environ.copy()
    env["TEST_TARGET"] = target_dir
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env,
            timeout=180 # Responsive tests with browsers might take longer
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
    
    for line in lines:
        line_stripped = line.strip()
        if '::' in line_stripped:
            outcome = None
            for status_word in [' PASSED', ' FAILED', ' ERROR', ' SKIPPED']:
                if status_word in line_stripped:
                    outcome = status_word.strip().lower()
                    nodeid = line_stripped.split(status_word)[0].strip()
                    break
            
            if outcome:
                tests.append({
                    "nodeid": nodeid,
                    "name": nodeid.split("::")[-1] if "::" in nodeid else nodeid,
                    "outcome": outcome,
                })
    
    return tests


def run_evaluation():
    """
    Run evaluation comparing before and after implementations.
    """
    print(f"\n{'=' * 60}")
    print("TECHVISION PRO RESPONSIVE EVALUATION")
    print(f"{'=' * 60}")
    
    project_root = Path(__file__).parent.parent
    tests_file = project_root / "tests" / "test_layout.py"
    
    before_results = run_pytest(tests_file, "Baseline", "repository_before")
    after_results = run_pytest(tests_file, "Refactored", "repository_after")
    
    # Comparison
    comparison = {
        "before_passed": before_results.get("summary", {}).get("passed", 0),
        "before_total": before_results.get("summary", {}).get("total", 0),
        "after_passed": after_results.get("summary", {}).get("passed", 0),
        "after_total": after_results.get("summary", {}).get("total", 0),
    }
    
    print(f"\n{'=' * 60}")
    print("EVALUATION SUMMARY")
    print(f"{'=' * 60}")
    print(f"Baseline (repository_before): {comparison['before_passed']}/{comparison['before_total']} passed")
    print(f"Refactored (repository_after): {comparison['after_passed']}/{comparison['after_total']} passed")
    
    return {
        "before": before_results,
        "after": after_results,
        "comparison": comparison,
        "success": after_results.get("success", False)
    }


def generate_output_path():
    """Generate output path for the report."""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    
    project_root = Path(__file__).parent.parent
    output_dir = project_root / "evaluation" / date_str / time_str
    output_dir.mkdir(parents=True, exist_ok=True)
    
    return output_dir / "report.json"


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Run TechVision Pro evaluation")
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()
    
    run_id = generate_run_id()
    started_at = datetime.now()
    
    print(f"Run ID: {run_id}")
    
    try:
        results = run_evaluation()
        success = results["success"]
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        results = None
        success = False
    
    finished_at = datetime.now()
    duration = (finished_at - started_at).total_seconds()
    
    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 6),
        "success": success,
        "environment": get_environment_info(),
        "results": results,
    }
    
    output_path = Path(args.output) if args.output else generate_output_path()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n✅ Report saved to: {output_path}")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
