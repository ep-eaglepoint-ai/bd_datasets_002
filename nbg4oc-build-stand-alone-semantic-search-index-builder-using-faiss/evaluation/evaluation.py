import json
import os
import platform
import re
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"


def environment_info() -> dict:
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }


def parse_test_output(output: str) -> tuple[int, int, int]:
    passed = 0
    failed = 0
    skipped = 0
    
    match = re.search(r'(\d+) passed', output)
    if match:
        passed = int(match.group(1))
    
    match = re.search(r'(\d+) failed', output)
    if match:
        failed = int(match.group(1))
    
    match = re.search(r'(\d+) skipped', output)
    if match:
        skipped = int(match.group(1))
    
    return passed, failed, skipped





def run_tests() -> dict:
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pytest", "tests/test_build_index.py", "-v", "--tb=short"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=600
        )
        output = proc.stdout + proc.stderr
        passed, failed, skipped = parse_test_output(output)
        
        return {
            "passed": failed == 0 and passed > 0,
            "return_code": proc.returncode,
            "tests_passed": passed,
            "tests_failed": failed,
            "tests_skipped": skipped,
            "output": output[:10000]
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "output": "pytest timeout after 600 seconds"
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "output": f"Error running tests: {str(e)}"
        }


def print_separator(char: str = "=", length: int = 70) -> None:
    print(char * length)


def print_test_summary(result: dict) -> None:
    status = "✅ PASS" if result["passed"] else "❌ FAIL"
    print(f"\n{'─' * 35}")
    print(f"  Test Results")
    print(f"{'─' * 35}")
    print(f"  Status:          {status}")
    print(f"  Tests Passed:    {result['tests_passed']}")
    print(f"  Tests Failed:    {result['tests_failed']}")
    print(f"  Tests Skipped:   {result['tests_skipped']}")
    print(f"  Return Code:     {result['return_code']}")


def run_evaluation() -> dict:
    run_id = str(uuid.uuid4())
    start = datetime.now(timezone.utc)
    
    print_separator()
    print("  SEMANTIC SEARCH INDEX BUILDER EVALUATION")
    print_separator()
    print(f"\n  Run ID:     {run_id}")
    print(f"  Started:    {start.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"  Python:     {platform.python_version()}")
    print(f"  Platform:   {platform.platform()}")
    
    print(f"  Environment: Docker container")
    
    print("\n" + "─" * 70)
    print("  Running Tests...")
    print("─" * 70)
    
    print("\n  Testing repository_after (implementation)...")
    test_result = run_tests()
    
    all_passed = test_result["passed"]
    all_passed = test_result["passed"]
    
    if all_passed:
        summary = f"All {test_result['tests_passed']} tests passed."
    else:
        summary = f"{test_result['tests_failed']} tests failed."
    
    end = datetime.now(timezone.utc)
    duration = (end - start).total_seconds()
    
    result = {
        "run_id": run_id,
        "started_at": start.isoformat(),
        "finished_at": end.isoformat(),
        "duration_seconds": duration,
        "environment": environment_info(),
        "tests": test_result,
        "success": all_passed,
        "summary": summary,
        "error": None
    }
    
    date_str = start.strftime("%Y-%m-%d")
    time_str = start.strftime("%H-%M-%S")
    report_dir = REPORTS / date_str / time_str
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "report.json"
    
    with open(report_path, "w") as f:
        json.dump(result, f, indent=2)
    
    print("\n" + "─" * 70)
    print("  RESULTS SUMMARY")
    print("─" * 70)
    print_test_summary(test_result)
    

    
    print("\n" + "─" * 70)
    print("  REPORT")
    print("─" * 70)
    print(f"\n  Report saved to: {report_path}")
    print(f"  Duration: {duration:.2f} seconds")
    print(f"\n  Summary: {summary}")
    
    print("\n" + "=" * 70)
    if result["success"]:
        print("  ✅ EVALUATION SUCCESSFUL ✅")
    else:
        print("  ❌ EVALUATION FAILED ❌")
    print("=" * 70 + "\n")
    
    return result


def main() -> int:
    try:
        result = run_evaluation()
        if result.get("success"):
            return 0
        return 1
    except Exception as e:
        print(f"\n❌ Evaluation failed with error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
