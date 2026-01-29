import sys
import json
import time
import uuid
import platform
import subprocess
import os
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"

def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }

def run_tests(repo_name: str):
    try:
        # Set PYTHONPATH so tests can import 'backend' directly from the target repo
        env = os.environ.copy()
        env["PYTHONPATH"] = str(ROOT / repo_name)

        proc = subprocess.run(
            [sys.executable, "-m", "pytest", "tests", "-q"],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=120
        )
        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": (proc.stdout + proc.stderr)[:8000]
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "pytest timeout"
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "output": str(e)
        }

def run_metrics(repo_path: Path):
    # For this task, we can measure the size of the repository logic
    # as a simple metric of "compactness" or "readability"
    metrics = {
        "backend_lines": 0,
        "frontend_lines": 0
    }
    
    backend_main = repo_path / "backend" / "main.py"
    if backend_main.exists():
        metrics["backend_lines"] = len(backend_main.read_text().splitlines())
        
    frontend_app = repo_path / "frontend" / "src" / "App.tsx"
    if frontend_app.exists():
        metrics["frontend_lines"] = len(frontend_app.read_text().splitlines())
        
    return metrics

def evaluate(repo_name: str):
    repo_path = ROOT / repo_name
    tests = run_tests(repo_name)
    metrics = run_metrics(repo_path)
    return {
        "tests": tests,
        "metrics": metrics
    }

def run_evaluation():
    run_id = str(uuid.uuid4())
    start = datetime.utcnow()
    
    before = evaluate("repository_before")
    after = evaluate("repository_after")
    
    comparison = {
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": "After implementation passed correctness check." if after["tests"]["passed"] else "After implementation failed correctness check."
    }
    
    end = datetime.utcnow()
    
    report = {
        "run_id": run_id,
        "started_at": start.isoformat() + "Z",
        "finished_at": end.isoformat() + "Z",
        "duration_seconds": (end - start).total_seconds(),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None
    }
    
    # Write report.json in timestamped directory
    now = datetime.utcnow()
    report_dir = REPORTS / now.strftime("%Y-%m-%d") / now.strftime("%H-%M-%S")
    report_dir.mkdir(parents=True, exist_ok=True)
    
    report_file = report_dir / "report.json"
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
        
    return report

def main():
    try:
        report = run_evaluation()
        return 0 if report["success"] else 1
    except Exception as e:
        print(f"Error during evaluation: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
