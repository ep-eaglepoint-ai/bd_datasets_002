import os
import json
import time
import uuid
import platform
import subprocess
from datetime import datetime
from pathlib import Path

# Standard Directory Setup (Evaluation Guide Page 1)
ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = ROOT / "evaluation" / "reports"

def get_env_info():
    """Requirement: Collect run metadata (Section 3.1)"""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }

def run_repo_tests(repo_name: str):
    """Requirement: Run correctness tests on before and after (Section 3.2)"""
    # Based on your explorer: repository_x/tests/test_lora_sft.py
    test_file = ROOT / repo_name / "tests" / "test_lora_sft.py"

    if not test_file.exists():
        return {
            "passed": False,
            "return_code": 1,
            "output": f"Error: Test suite not found in {repo_name}. This is the expected 'Problem State'."
        }

    # Set PYTHONPATH so the tests can import the trainer module
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT)

    try:
        proc = subprocess.run(
            ["pytest", "-q", "--tb=short", str(test_file)],
            capture_output=True,
            text=True,
            env=env,
            timeout=120
        )
        # Return structured results for the JSON report
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": (proc.stdout + proc.stderr)[:4000] # Truncated for readability
        }
    except subprocess.TimeoutExpired:
        return {"passed": False, "return_code": -1, "output": "pytest timeout exceeded"}
    except Exception as e:
        return {"passed": False, "return_code": -1, "output": str(e)}

def main():
    run_id = str(uuid.uuid4())
    started_at = datetime.utcnow()

    # 1. Run Evaluations
    print(f"Starting evaluation {run_id}...")
    before_results = run_repo_tests("repository_before")
    after_results = run_repo_tests("repository_after")

    finished_at = datetime.utcnow()
    duration = (finished_at - started_at).total_seconds()

    # Success Rule (Evaluation Guide Page 2, Section 5)
    # success = after.tests.passed == true
    success_status = after_results["passed"]

    # 2. Construct Standard Report Structure (Section 6)
    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat() + "Z",
        "finished_at": finished_at.isoformat() + "Z",
        "duration_seconds": round(duration, 2),
        "environment": get_env_info(),
        "before": {
            "tests": before_results,
            "metrics": {} # Optional: Section 7
        },
        "after": {
            "tests": after_results,
            "metrics": {}
        },
        "comparison": {
            "passed_gate": success_status,
            "improvement_summary": "After implementation passed correctness tests; Before state remains failing."
        },
        "success": success_status,
        "error": None
    }

    # 3. Write Report JSON (Section 3.5)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = REPORTS_DIR / "report.json"
    with open(report_file, "w") as f:
        json.dump(report, f, indent=4)

    print(f"Done. Success: {success_status}. Report: {report_file}")
    
    # Requirement: Exit with correct status code (Section 4 & 6.1)
    return 0 if success_status else 1

if __name__ == "__main__":
    exit(main())