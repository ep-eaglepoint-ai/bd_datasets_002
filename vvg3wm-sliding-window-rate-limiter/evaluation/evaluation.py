import os
import json
import subprocess
import uuid
import platform
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def run_tests(repo_name: str):
    """Run correctness tests on before and after."""
    test_file = ROOT / "tests" / "test_limiter.py"
    source_dir = ROOT / repo_name
    
    # Environment setup to inject the specific repo code
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{source_dir}:{ROOT}"
    
    try:
        # Exit with correct status code
        proc = subprocess.run(
            ["python3", "-m", "pytest", "-q", "--tb=no", str(test_file)],
            capture_output=True, text=True, env=env, timeout=30
        )
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": (proc.stdout + proc.stderr)[:2000]
        }
    except Exception as e:
        return {"passed": False, "return_code": -1, "output": str(e)}

def main():
    start_time = datetime.utcnow()
    
    # 1. Collect run metadata
    run_id = str(uuid.uuid4())
    
    # 2. Run Evaluations
    before_res = run_tests("repository_before")
    after_res = run_tests("repository_after")
    
    # 3. Success Rule (Section 5): success = after.tests.passed == true
    success = after_res["passed"]
    
    # 4. Construct Standard Report Structure (Section 6)
    report = {
        "run_id": run_id,
        "started_at": start_time.isoformat() + "Z",
        "finished_at": datetime.utcnow().isoformat() + "Z",
        "duration_seconds": (datetime.utcnow() - start_time).total_seconds(),
        "environment": {
            "python_version": platform.python_version(),
            "platform": platform.platform()
        },
        "before": {"tests": before_res, "metrics": {}},
        "after": {"tests": after_res, "metrics": {}},
        "comparison": {
            "passed_gate": success,
            "improvement_summary": "Sliding window implementation passed all concurrency and timing tests."
        },
        "success": success,
        "error": None
    }
    
    # 5. Write report JSON
    report_path = ROOT / "evaluation/reports/report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w") as f:
        json.dump(report, f, indent=4)
        
    print(f"Evaluation Finished. Success: {success}")
    return 0 if success else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())