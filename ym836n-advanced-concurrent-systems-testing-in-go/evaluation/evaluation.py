#!/usr/bin/env python
import sys
import json
import time
import uuid
import platform
import subprocess
import shutil
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
    Handles test copying and patching for repository_before to ensure robust verification.
    """
    is_before = "repository_before" in target_repo
    
    # Path to the source of truth for tests
    src_test_dir = ROOT / "repository_after" / "batch" / "unit_test"

    if is_before:
        # For repository_before, we create a temporary test setup inside the legacy module
        # This mirrors what the Dockerfile 'test-before' stage does
        test_dir = ROOT / "repository_before" / "batch" / "unit_test"
        
        # Cleanup any previous run
        if test_dir.exists():
            shutil.rmtree(test_dir)
            
        try:
            # Copy the unit tests to the before location
            shutil.copytree(src_test_dir, test_dir)
            
            # Patch the imports to point to the legacy package
            for file_path in test_dir.glob("*.go"):
                with open(file_path, "r") as f:
                    content = f.read()
                
                # 1. Point import to legacy module: example.com/batch-standalone/batch
                content = content.replace("example.com/batch-optimized", "example.com/batch-standalone/batch")
                # 2. Mock the missing 'batch.Timer' interface (legacy code doesn't have it)
                content = content.replace("batch.Timer", "interface{ C() <-chan time.Time; Stop() bool }")
                
                with open(file_path, "w") as f:
                    f.write(content)
                    
        except Exception as e:
             return {
                "passed": False,
                "return_code": -1,
                "output": f"Setup failed for before tests: {str(e)}",
                "metrics": {"passed_count": 0, "failed_count": 1, "total_count": 1}
            }
    else:
        # FOr repository_after, run tests directly where they reside
        test_dir = src_test_dir

    try:
        # Run go test from the directory
        env = {**subprocess.os.environ, "GO111MODULE": "on", "CGO_ENABLED": "0", "GOWORK": "off"}
        proc = subprocess.run(
            ["go", "test", "-v", "."],
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
        # Cleanup the temporary test dir in repository_before
        if is_before and test_dir.exists():
            shutil.rmtree(test_dir)

def run_meta_tests():
    """
    Runs meta validation tests from tests directory.
    This executes 'tests/meta_test.go' which performs Mutation Testing:
    it intentionally breaks the code and verifies the unit tests fail.
    """
    tests_dir = ROOT / "tests"
    
    try:
        env = {**subprocess.os.environ, "GO111MODULE": "on", "CGO_ENABLED": "0", "GOWORK": "off"}
        proc = subprocess.run(
            ["go", "test", "-v", "-run", "^TestMutation"], # Explicitly run the mutation test
            cwd=tests_dir,
            capture_output=True,
            text=True,
            timeout=120, # Increased timeout for mutation cycles
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
