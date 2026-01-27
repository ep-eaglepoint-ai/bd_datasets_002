import os
import sys
import json
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime

# --- Configuration ---
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
REPORTS_BASE_DIR = SCRIPT_DIR / "reports"

def generate_run_id():
    """Generates a unique 8-character ID for this specific execution."""
    return uuid.uuid4().hex[:8]

def get_environment_info():
    """Identifies the environment without needing external flags."""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "root_dir": str(ROOT),
        "user": os.environ.get("USER") or os.environ.get("USERNAME")
    }

def get_output_path():
    """Creates a timestamped directory structure for the report."""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    
    output_dir = REPORTS_BASE_DIR / date_str / time_str
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / "report.json"

def run_tests(repo_src):
    """Executes the test suite and captures the output."""
    print(f"🔎 Auditing implementation in: {repo_src}...")
    
    test_file = ROOT / "repository_after" / "src" / "test_discount_engine.py"
    
    # Isolate PYTHONPATH so the tests only see the code we want them to see
    env = {**os.environ, "PYTHONPATH": f"{ROOT}:{ROOT}/{repo_src}"}
    
    start_time = datetime.now()
    
    try:
        # We use sys.executable -m pytest to avoid "command not found" errors
        result = subprocess.run(
            [sys.executable, "-m", "pytest", str(test_file), "-v"],
            capture_output=True,
            text=True,
            env=env,
            timeout=120
        )
        
        duration = (datetime.now() - start_time).total_seconds() * 1000
        output = result.stdout + result.stderr
        
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": output,
            "duration_ms": duration,
            "tests": parse_results(output)
        }
    except Exception as e:
        return {"success": False, "error": str(e), "tests": []}

def parse_results(output):
    """Extracts test names and status from pytest verbose output."""
    results = []
    for line in output.splitlines():
        if "::" in line and ("PASSED" in line or "FAILED" in line):
            # Pytest format: path/to/test.py::test_name STATUS
            parts = line.split("::")[-1].split(" ")
            results.append({
                "name": parts[0],
                "outcome": "passed" if "PASSED" in parts else "failed"
            })
    return results

def main():
    run_id = generate_run_id()
    print(f"🚀 Starting Discount Engine Evaluation [Run ID: {run_id}]")

    # Audit the 'After' implementation
    results = run_tests("repository_after/src")
    
    summary = {
        "total": len(results["tests"]),
        "passed": len([t for t in results["tests"] if t["outcome"] == "passed"]),
        "failed": len([t for t in results["tests"] if t["outcome"] == "failed"]),
    }

    report = {
        "run_id": run_id,
        "timestamp": datetime.now().isoformat(),
        "environment": get_environment_info(),
        "results": results,
        "summary": summary,
        "success": results["success"] and summary["passed"] > 0
    }

    output_path = get_output_path()
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "="*50)
    print(f"TEST SUMMARY (ID: {run_id})")
    print(f"Total:  {summary['total']}")
    print(f"Passed: {summary['passed']}")
    print(f"Failed: {summary['failed']}")
    print("="*50)
    print(f"✅ Canonical Report: {output_path}")

    # Final exit for Docker/AI Evaluator
    sys.exit(0 if report["success"] else 1)

if __name__ == "__main__":
    main()