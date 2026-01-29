#!/usr/bin/env python
import sys
import json
import time
import uuid
import platform
import subprocess
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"

def environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }

def run_tests(target_repo: str):
    """
    Runs go tests for the specified repository.
    Handles go.mod modification for repository_before.
    """
    test_dir = ROOT / "tests" / "unit"
    go_mod_path = test_dir / "go.mod"
    
    is_before_repo = "repository_before" in target_repo
    original_content = None

    try:
        if is_before_repo:
            # Read original go.mod
            with open(go_mod_path, "r") as f:
                original_content = f.read()
            
            # Replace repository_after with repository_before
            modified_content = original_content.replace("repository_after", "repository_before")
            with open(go_mod_path, "w") as f:
                f.write(modified_content)

        # Run go test
        env = {**subprocess.os.environ, "GO111MODULE": "on", "CGO_ENABLED": "0"}
        proc = subprocess.run(
            ["go", "test", "-v", "./..."],
            cwd=test_dir,
            capture_output=True,
            text=True,
            timeout=120,
            env=env
        )

        output = (proc.stdout + proc.stderr)
        
        # Parse test results
        passed = 0
        failed = 0
        skipped = 0
        total = 0
        
        for line in output.splitlines():
            line = line.strip()
            if line.startswith("--- PASS:"):
                passed += 1
                total += 1
            elif line.startswith("--- FAIL:"):
                failed += 1
                total += 1
            elif "SKIP:" in line:
                skipped += 1
                total += 1

        # Fallback if no specific test markers found
        if total == 0:
            if "PASS" in output and proc.returncode == 0:
                passed = 1
                total = 1
            elif "FAIL" in output or proc.returncode != 0:
                failed = 1
                total = 1

        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": output[:8000],
            "metrics": {
                "passed_count": passed,
                "failed_count": failed,
                "skipped_count": skipped,
                "total_count": total
            }
        }

    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "output": "go test timeout",
            "metrics": {"passed_count": 0, "failed_count": 1, "skipped_count": 0, "total_count": 1}
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "output": f"Error: {str(e)}",
            "metrics": {"passed_count": 0, "failed_count": 1, "skipped_count": 0, "total_count": 1}
        }
    finally:
        # Restore go.mod if it was modified
        if original_content is not None:
            with open(go_mod_path, "w") as f:
                f.write(original_content)

def run_meta_tests():
    """
    Runs meta validation tests from tests directory.
    """
    tests_dir = ROOT / "tests"
    
    try:
        env = {**subprocess.os.environ, "GO111MODULE": "on", "CGO_ENABLED": "0"}
        proc = subprocess.run(
            ["go", "test", "-v", "-run", "^TestMeta"],
            cwd=tests_dir,
            capture_output=True,
            text=True,
            timeout=60,
            env=env
        )
        
        output = (proc.stdout + proc.stderr)
        
        # Parse test results
        passed = 0
        failed = 0
        total = 0
        
        for line in output.splitlines():
            line = line.strip()
            if line.startswith("--- PASS:"):
                passed += 1
                total += 1
            elif line.startswith("--- FAIL:"):
                failed += 1
                total += 1

        if total == 0:
            if "PASS" in output and proc.returncode == 0:
                passed = 1
                total = 1
            elif "FAIL" in output or proc.returncode != 0:
                failed = 1
                total = 1

        return {
            "passed": proc.returncode == 0,
            "return_code": proc.returncode,
            "output": output[:8000],
            "metrics": {
                "passed_count": passed,
                "failed_count": failed,
                "total_count": total
            }
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "output": f"Error: {str(e)}",
            "metrics": {"passed_count": 0, "failed_count": 1, "total_count": 1}
        }

def run_evaluation():
    run_id = str(uuid.uuid4())
    start = datetime.now(timezone.utc)
    
    before = run_tests("repository_before")
    after = run_tests("repository_after")
    meta = run_meta_tests()
    
    # Comparison logic
    passed_gate = after["passed"] and meta["passed"]
    
    improvement_summary = ""
    if before["metrics"]["passed_count"] < after["metrics"]["passed_count"]:
        improvement_summary = f"Improved from {before['metrics']['passed_count']} to {after['metrics']['passed_count']} passing tests."
    elif before["metrics"]["passed_count"] == after["metrics"]["passed_count"]:
        improvement_summary = "Maintained same number of passing tests."
    else:
        improvement_summary = "Regression detected in passing tests."

    end = datetime.now(timezone.utc)
    
    report = {
        "run_id": run_id,
        "started_at": start.isoformat() + "Z",
        "finished_at": end.isoformat() + "Z",
        "duration_seconds": (end - start).total_seconds(),
        "environment": environment_info(),
        "before": {
            "tests": {
                "passed": before["passed"],
                "return_code": before["return_code"],
                "output": before["output"]
            },
            "metrics": before["metrics"]
        },
        "after": {
            "tests": {
                "passed": after["passed"],
                "return_code": after["return_code"],
                "output": after["output"]
            },
            "metrics": after["metrics"]
        },
        "meta": {
            "tests": {
                "passed": meta["passed"],
                "return_code": meta["return_code"],
                "output": meta["output"]
            },
            "metrics": meta["metrics"]
        },
        "comparison": {
            "passed_gate": passed_gate,
            "improvement_summary": improvement_summary
        },
        "success": passed_gate,
        "error": None
    }
    
    return report

def main():
    report = run_evaluation()
    
    REPORTS.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    report_path = REPORTS / f"evaluation_{timestamp}.json"
    
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"Evaluation finished. Success: {report['success']}")
    print(f"Report saved to: {report_path}")
    
    return 0 if report["success"] else 1

if __name__ == "__main__":
    sys.exit(main())
