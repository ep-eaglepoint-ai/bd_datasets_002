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

def environment_info():
    return {
        "python": platform.python_version(),
        "platform": platform.platform()
    }

def parse_test_output(output):
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

def run_tests_direct():
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pytest", "tests/test_build_index.py", "-v", "--tb=short"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=300
        )
        output = proc.stdout + proc.stderr
        passed, failed, skipped = parse_test_output(output)
        
        return {
            "passed": failed == 0 and passed > 0,
            "return_code": proc.returncode,
            "tests_passed": passed,
            "tests_failed": failed,
            "tests_skipped": skipped,
            "output": output[:8000]
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "output": "Error running tests: Timeout expired"
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

def run_metrics(repo_path):
    return {}

def evaluate(repo_name):
    repo_path = ROOT / repo_name
    tests = run_tests_direct()
    metrics = run_metrics(repo_path)
    return {"tests": tests, "metrics": metrics}

def print_separator(char='=', length=70):
    print(char * length)

def print_test_summary(name, result):
    tests = result["tests"]
    status = "✅ PASS" if tests["passed"] else "❌ FAIL"
    print(f"\n{'─' * 35}")
    print(f"  {name}")
    print(f"{'─' * 35}")
    print(f"  Status:          {status}")
    print(f"  Tests Passed:    {tests['tests_passed']}")
    print(f"  Tests Failed:    {tests['tests_failed']}")
    print(f"  Tests Skipped:   {tests['tests_skipped']}")
    print(f"  Return Code:     {tests['return_code']}")

def run_evaluation():
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
    
    print(f"\n{'─' * 70}")
    print("  Running Tests...")
    print(f"{'─' * 70}")
    
    print("\n  [1/2] Testing repository_before (skipped)...")
    before = None
    
    print("  [2/2] Testing repository_after (optimized)...")
    after = evaluate("repository_after")
    
    comparison = {
        "before_passed": None,
        "after_passed": after["tests"]["passed"],
        "before_failed_count": None,
        "after_failed_count": after["tests"]["tests_failed"],
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": ""
    }
    
    if comparison["passed_gate"]:
        comparison["improvement_summary"] = f"Optimization successful: repository_after passes all {after['tests']['tests_passed']} tests."
    else:
        comparison["improvement_summary"] = f"Optimization incomplete: repository_after has {after['tests']['tests_failed']} failing tests."
        
    end = datetime.now(timezone.utc)
    duration = (end - start).total_seconds()
    
    result = {
        "run_id": run_id,
        "started_at": start.isoformat(),
        "finished_at": end.isoformat(),
        "duration_seconds": duration,
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None
    }
    
    date_str = start.strftime("%Y-%m-%d")
    time_str = start.strftime("%H-%M-%S")
    report_dir = REPORTS / date_str / time_str
    
    try:
        report_dir.mkdir(parents=True, exist_ok=True)
        report_path = report_dir / "report.json"
        
        with open(report_path, "w") as f:
            json.dump(result, f, indent=2)
            
        print(f"\n{'─' * 70}")
        print("  RESULTS SUMMARY")
        print(f"{'─' * 70}")
        
        print_test_summary("repository_after (optimized)", after)
        
        print(f"\n{'─' * 70}")
        print("  COMPARISON")
        print(f"{'─' * 70}")
        
        after_status = "✅ All tests pass" if after["tests"]["passed"] else f"❌ {after['tests']['tests_failed']} tests FAILED"
        gate_status = "✅ PASSED" if comparison["passed_gate"] else "❌ FAILED"
        
        print(f"\n  Before (unoptimized):  None")
        print(f"  After (optimized):     {after_status}")
        print(f"  Optimization Gate:     {gate_status}")
        print(f"\n  Summary: {comparison['improvement_summary']}")
        
        print(f"\n{'─' * 70}")
        print("  REPORT")
        print(f"{'─' * 70}")
        
        print(f"\n  Report saved to: {report_path}")
        print(f"  Duration: {duration:.2f} seconds")
        
        print(f"\n{'=' * 70}")
        if result["success"]:
            print("  ✅ EVALUATION SUCCESSFUL - OPTIMIZATION VERIFIED ✅")
        else:
            print("  ❌ EVALUATION FAILED ❌")
        print(f"{'=' * 70}\n")
        
        return result
        
    except Exception as e:
        print(f"Error writing report: {e}")
        return {"success": False}

def main():
    try:
        result = run_evaluation()
        sys.exit(0 if result["success"] else 1)
    except Exception as e:
        print(f"\n❌ Evaluation failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
