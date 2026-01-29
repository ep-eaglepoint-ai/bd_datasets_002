import os
import sys
import json
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime


ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = ROOT / "evaluation" / "reports"


def environment_info():
    """Collect environment metadata."""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }


def run_tests(repo_path: Path):
    try:
        env = {"PYTHONPATH": str(repo_path)}
        
        proc = subprocess.run(
            [sys.executable, "-m", "pytest", "tests", "-v", "--tb=short"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=120,
            env={**os.environ, **env}
        )
        
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": (proc.stdout + proc.stderr)[:8000]  # Truncate to prevent overflow
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "Test execution timed out after 120 seconds"
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "output": f"Error running tests: {str(e)}"
        }


def evaluate(repo_name: str):
    repo_path = ROOT / repo_name
    
    tests = run_tests(repo_path)
    
    return {
        "tests": tests
    }


def run_evaluation():
    run_id = str(uuid.uuid4())
    start = datetime.now()
    
    # Evaluate both repositories
    before = evaluate("repository_before")
    after = evaluate("repository_after")
    
    # Determine success based on the standard rule:
    # Success if after tests pass
    passed_gate = after["tests"]["passed"]
    
    # Generate improvement summary
    if passed_gate:
        if not before["tests"]["passed"]:
            improvement_summary = "Implementation successful: all tests pass in repository_after"
        else:
            improvement_summary = "Both implementations pass tests"
    else:
        improvement_summary = "Implementation incomplete: tests fail in repository_after"
    
    comparison = {
        "passed_gate": passed_gate,
        "improvement_summary": improvement_summary
    }
    
    end = datetime.now()
    
    return {
        "run_id": run_id,
        "started_at": start.isoformat() + "Z",
        "finished_at": end.isoformat() + "Z",
        "duration_seconds": (end - start).total_seconds(),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": passed_gate,
        "error": None
    }


def main():
    print("=" * 60)
    print("LRU Cache Evaluation")
    print("=" * 60)
    print()
    
    try:
        # Run evaluation
        report = run_evaluation()
        
        # Ensure reports directory exists
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Write report to file
        report_file = REPORTS_DIR / f"evaluation_report_{report['run_id']}.json"
        with open(report_file, "w") as f:
            json.dump(report, indent=2, fp=f)
        
        # Also write as latest report
        latest_report = REPORTS_DIR / "latest_report.json"
        with open(latest_report, "w") as f:
            json.dump(report, indent=2, fp=f)
        
        # Print summary
        print(f"Evaluation ID: {report['run_id']}")
        print(f"Duration: {report['duration_seconds']:.2f} seconds")
        print()
        print("BEFORE (repository_before):")
        print(f"  Tests Passed: {report['before']['tests']['passed']}")
        print(f"  Return Code: {report['before']['tests']['return_code']}")
        print()
        print("AFTER (repository_after):")
        print(f"  Tests Passed: {report['after']['tests']['passed']}")
        print(f"  Return Code: {report['after']['tests']['return_code']}")
        print()
        print("COMPARISON:")
        print(f"  Passed Gate: {report['comparison']['passed_gate']}")
        print(f"  Summary: {report['comparison']['improvement_summary']}")
        print()
        print(f"SUCCESS: {report['success']}")
        print()
        print(f"Report saved to: {report_file}")
        print(f"Latest report: {latest_report}")
        print()
        
        # Return appropriate exit code
        return 0 if report["success"] else 1
        
    except Exception as e:
        print(f"ERROR: Evaluation failed with exception: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
