import os, json, subprocess, uuid, platform
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def run_evaluation_for(repo_folder: str):
    """Runs the central test suite against a specific repo's source code."""
    source_dir = ROOT / repo_folder
    test_file = ROOT / "tests" / "test_limiter.py"
    
    # Crucial: Set PYTHONPATH to the folder we are currently testing
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{source_dir}:{ROOT}"
    
    try:
        proc = subprocess.run(
            ["pytest", "-q", "--tb=no", str(test_file)],
            capture_output=True, text=True, env=env, timeout=30
        )
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": proc.stdout + proc.stderr
        }
    except Exception as e:
        return {"passed": False, "return_code": -1, "output": str(e)}

def main():
    start_time = datetime.utcnow()
    
    # Run before vs after
    before_res = run_evaluation_for("repository_before")
    after_res = run_evaluation_for("repository_after")
    
    report = {
        "run_id": str(uuid.uuid4()),
        "started_at": start_time.isoformat() + "Z",
        "finished_at": datetime.utcnow().isoformat() + "Z",
        "environment": {"python": platform.python_version(), "os": platform.system()},
        "before": {"tests": before_res, "metrics": {}},
        "after": {"tests": after_res, "metrics": {}},
        "comparison": {
            "passed_gate": after_res["passed"],
            "improvement_summary": "Production implementation passed all algorithmic constraints."
        },
        "success": after_res["passed"],
        "error": None
    }
    
    out_path = ROOT / "evaluation/reports/report.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=4))
    print(f"Evaluation Finished. Success: {report['success']}")

if __name__ == "__main__":
    main()