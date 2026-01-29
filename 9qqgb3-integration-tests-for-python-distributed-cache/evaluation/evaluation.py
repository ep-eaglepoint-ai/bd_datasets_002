#!/usr/bin/env python3
import sys
import json
import time
import uuid
import platform
import subprocess
import os
from pathlib import Path
from datetime import datetime, timezone

# Signal only available on Unix
if sys.platform != "win32":
    import signal

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"


def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }


def run_tests(test_path: str, import_path: str):
    """
    Run pytest tests and capture results.
    
    Args:
        test_path: Path to test directory
        import_path: Path to add to PYTHONPATH for imports
        
    Returns:
        Dictionary with test results
    """
    start_time = time.time()
    proc = None
    
    try:
        # Set PYTHONPATH to ensure imports work
        env = {**os.environ, "PYTHONPATH": import_path}
        
        print(f"Running pytest on {test_path}...", flush=True)
        
        # Use Popen for better control
        # Add --maxfail=1 and --tb=line to exit faster and reduce output
        proc = subprocess.Popen(
            [sys.executable, "-m", "pytest", test_path, "-q", "--tb=line", "--maxfail=100"],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            env=env,
            bufsize=1,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
        )
        
        try:
            stdout, _ = proc.communicate(timeout=180)  # Reduced to 3 minutes
            return_code = proc.returncode
            print(f"Pytest completed with return code {return_code}", flush=True)
        except subprocess.TimeoutExpired:
            print("Pytest timeout - force killing process...", flush=True)
            # Force kill on Windows
            if sys.platform == "win32":
                try:
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], 
                                 capture_output=True, timeout=5)
                except:
                    pass
            else:
                try:
                    import signal
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                except:
                    try:
                        proc.kill()
                    except:
                        pass
            try:
                proc.wait(timeout=5)
            except:
                pass
            return {
                "passed": False,
                "return_code": -1,
                "output": "pytest timeout after 180 seconds"
            }
        
        elapsed_time = time.time() - start_time
        
        # Truncate output to 8000 chars
        output = stdout[:8000] if stdout else ""
        
        return {
            "passed": return_code == 0,
            "return_code": return_code,
            "output": output
        }
    except Exception as e:
        if proc is not None:
            if sys.platform == "win32":
                try:
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], 
                                 capture_output=True, timeout=2)
                except:
                    pass
            else:
                try:
                    proc.kill()
                    proc.wait(timeout=2)
                except:
                    pass
        return {
            "passed": False,
            "return_code": -1,
            "output": f"Error running tests: {str(e)}"
        }


def run_metrics(repo_path: Path):
    # Optional – trainers implement if needed
    return {}


def evaluate(repo_name: str):
    repo_path = ROOT / repo_name
    
    if not repo_path.exists():
        return {
            "tests": {
                "passed": False,
                "return_code": -1,
                "output": f"Repository {repo_name} does not exist"
            },
            "metrics": {}
        }
    
    # For repository_before: run regular tests from repository_after/tests
    # For repository_after: run metatests from tests/metatest
    if repo_name == "repository_before":
        test_dir = str(ROOT / "repository_after" / "tests")
    else:  # repository_after
        test_dir = str(ROOT / "tests" / "metatest")
    
    import_path = str(ROOT)
    
    tests = run_tests(test_dir, import_path)
    metrics = run_metrics(repo_path)
    
    return {
        "tests": tests,
        "metrics": metrics
    }


def run_evaluation():
    run_id = str(uuid.uuid4())
    start = datetime.now(timezone.utc)
    
    # Run regular tests for before, metatests for after
    print("Running tests on repository_before (regular tests)...", flush=True)
    before = evaluate("repository_before")
    
    print("Running tests on repository_after (metatests)...", flush=True)
    after = evaluate("repository_after")
    
    comparison = {
        "passed_gate": after["tests"]["passed"],
        "improvement_summary": "After implementation passed correctness checks."
    }
    
    end = datetime.now(timezone.utc)
    return {
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


def main():
    print("Starting evaluation...", flush=True)
    REPORTS.mkdir(parents=True, exist_ok=True)
    
    report = run_evaluation()
    
    # Create nested directory structure: reports/yy-mm-dd/HH-MM-SS/report.json
    now = datetime.now(timezone.utc)
    date_dir = now.strftime("%y-%m-%d")
    time_dir = now.strftime("%H-%M-%S")
    
    final_report_dir = REPORTS / date_dir / time_dir
    final_report_dir.mkdir(parents=True, exist_ok=True)
    
    path = final_report_dir / "report.json"
    path.write_text(json.dumps(report, indent=2))
    
    print(f"Report written to {path}")
    print(f"Success: {report['success']}")
    return 0 if report["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
