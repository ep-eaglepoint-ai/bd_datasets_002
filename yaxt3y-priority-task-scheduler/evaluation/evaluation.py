#!/usr/bin/env python3
import os
import sys
import json
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"

def generate_run_id():
    """Generate a short unique run ID."""
    return uuid.uuid4().hex

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

def run_pytest_with_pythonpath(pythonpath, tests_dir, label, pattern="test_*.py"):
    """
    Run pytest on the tests/ folder with specific PYTHONPATH.
    """
    print(f"\n{'=' * 60}")
    print(f"RUNNING TESTS: {label.upper()}")
    print(f"{'=' * 60}")
    
    cmd = [
        sys.executable, "-m", "pytest",
        str(tests_dir),
        "-v",
        "--tb=short",
    ]
    
    if pattern:
        cmd.extend(["-k", pattern])
    
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{pythonpath}{os.pathsep}{tests_dir}"
    env["EVALUATION_RUN"] = "true" # Critical for verifying strict failures in before implementation
    
    try:
        # 3 minute timeout to catch unoptimized code hangs
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(Path(tests_dir).parent),
            env=env,
            timeout=180 
        )
        
        stdout = result.stdout
        stderr = result.stderr
        passed = result.returncode == 0
        
        # Count passed/failed from output string for summary (optional but helpful logging)
        # Note: We rely on returncode for simple boolean success
        
        print(f"Return code: {result.returncode}")
        
        output_log = (stdout + stderr)[:8000] # Truncate as per guideline suggestion
        
        return {
            "passed": passed,
            "return_code": result.returncode,
            "output": output_log
        }
        
    except subprocess.TimeoutExpired:
        print("❌ Test execution timed out")
        return {
            "passed": False,
            "return_code": -1,
            "output": "pytest timeout"
        }
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return {
            "passed": False,
            "return_code": -1,
            "output": str(e)
        }

def evaluate(repo_name):
    project_root = Path(__file__).parent.parent
    repo_path = project_root / repo_name
    tests_dir = project_root / "tests"
    
    # We do not have separate specific metrics yet, returning empty dict
    metrics = {}
    
    tests_result = run_pytest_with_pythonpath(
        str(repo_path),
        tests_dir,
        repo_name,
        pattern=""
    )
    
    return {
        "tests": tests_result,
        "metrics": metrics
    }

def run_evaluation():
    run_id = generate_run_id()
    start = datetime.utcnow() # using utcnow as per sample
    
    before = evaluate("repository_before")
    after = evaluate("repository_after")
    
    passed_gate = after["tests"]["passed"]
    improvement_summary = "After implementation passed correctness checks" if passed_gate else "After implementation failed checks"
    
    comparison = {
        "passed_gate": passed_gate,
        "improvement_summary": improvement_summary
    }
    
    end = datetime.utcnow()
    
    return {
        "run_id": run_id,
        "started_at": start.isoformat() + "Z",
        "finished_at": end.isoformat() + "Z",
        "duration_seconds": (end - start).total_seconds(),
        "environment": get_environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": None
    }

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", help="Optional output path")
    args = parser.parse_args()

    REPORTS.mkdir(parents=True, exist_ok=True)
    
    report = run_evaluation()
    
    # Write to specific path if requested, otherwise standard latest.json and report.json in reports/
    
    # 1. Standard report.json (as per guideline text 'Standard Report Structure (report.json)')
    path = REPORTS / "report.json"
    path.write_text(json.dumps(report, indent=2))
    print(f"Report written to {path}")
    
    # 2. latest.json (as per sample code)
    latest_path = REPORTS / "latest.json"
    latest_path.write_text(json.dumps(report, indent=2))
    
    # 3. If output arg provided (CI often uses this)
    if args.output:
        out_p = Path(args.output)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(json.dumps(report, indent=2))
        print(f"Report also written to {out_p}")

    return 0 if report["success"] else 1

if __name__ == "__main__":
    sys.exit(main())
