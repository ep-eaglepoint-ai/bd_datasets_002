#!/usr/bin/env python3
"""
Evaluation script for Inventory Reservation PL/pgSQL implementation
"""
import os
import sys
import json
import uuid
import time
import platform
import subprocess
import socket
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVAL_DIR = Path(__file__).resolve().parent

def get_git_info():
    """Get git commit and branch info if available"""
    try:
        import subprocess
        commit = subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD'],
            cwd=ROOT, stderr=subprocess.DEVNULL
        ).decode().strip()
        branch = subprocess.check_output(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            cwd=ROOT, stderr=subprocess.DEVNULL
        ).decode().strip()
        return commit, branch
    except:
        return "unknown", "unknown"

def environment_info():
    """Collect environment information matching example format"""
    git_commit, git_branch = get_git_info()
    
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "os": platform.system(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "hostname": socket.gethostname(),
        "git_commit": git_commit,
        "git_branch": git_branch
    }

def parse_pytest_output(output):
    """Parse pytest output to extract test results"""
    tests = []
    lines = output.split('\n')
    
    for line in lines:
        if '::' in line and ('PASSED' in line or 'FAILED' in line or 'ERROR' in line or 'SKIPPED' in line):
            parts = line.strip().split()
            if len(parts) >= 2:
                nodeid = parts[0]
                outcome = parts[1].lower()
                
                test_info = {
                    "nodeid": nodeid,
                    "name": nodeid.split('::')[-1],
                    "outcome": "passed" if 'passed' in outcome else 
                              "failed" if 'failed' in outcome else 
                              "error" if 'error' in outcome else 
                              "skipped"
                }
                tests.append(test_info)

    if not tests:
        if "passed" in output.lower() and "failed" not in output.lower():
            tests = [{
                "nodeid": "tests/test_inventory_reservation.py",
                "name": "test_suite",
                "outcome": "passed"
            }]
        else:
            tests = [{
                "nodeid": "tests/test_inventory_reservation.py",
                "name": "test_suite",
                "outcome": "failed"
            }]
    
    total = len(tests)
    passed = sum(1 for t in tests if t["outcome"] == "passed")
    failed = sum(1 for t in tests if t["outcome"] == "failed")
    errors = sum(1 for t in tests if t["outcome"] == "error")
    skipped = sum(1 for t in tests if t["outcome"] == "skipped")
    
    summary = {
        "total": total,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "skipped": skipped
    }
    
    return tests, summary

def run_tests():
    """Run pytest tests on repository_after"""
    tests_dir = ROOT / "tests"
    
    if not tests_dir.exists():
        return {
            "success": False,
            "exit_code": 1,
            "tests": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
            "stdout": "No tests directory found",
            "stderr": ""
        }
  
    repo_path = ROOT / "repository_after"
    sql_file = repo_path / "inventory_reservation.sql"
    
    if not sql_file.exists():
        return {
            "success": False,
            "exit_code": 1,
            "tests": [{
                "nodeid": "tests/test_inventory_reservation.py::TestInventoryReservation",
                "name": "inventory_reservation_function",
                "outcome": "failed"
            }],
            "summary": {"total": 1, "passed": 0, "failed": 1, "errors": 0, "skipped": 0},
            "stdout": "No inventory_reservation.sql found in repository_after",
            "stderr": ""
        }
    
    try:
  
        proc = subprocess.run(
            ["pytest", str(tests_dir), "-v"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=120
        )

        tests, summary = parse_pytest_output(proc.stdout + proc.stderr)
        
        return {
            "success": proc.returncode == 0,
            "exit_code": proc.returncode,
            "tests": tests,
            "summary": summary,
            "stdout": (proc.stdout + proc.stderr)[:5000],
            "stderr": ""
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "exit_code": 1,
            "tests": [{
                "nodeid": "tests/test_inventory_reservation.py",
                "name": "test_suite",
                "outcome": "failed"
            }],
            "summary": {"total": 1, "passed": 0, "failed": 1, "errors": 0, "skipped": 0},
            "stdout": "pytest timeout after 120 seconds",
            "stderr": ""
        }
    except Exception as e:
        return {
            "success": False,
            "exit_code": 1,
            "tests": [{
                "nodeid": "tests/test_inventory_reservation.py",
                "name": "test_suite",
                "outcome": "failed"
            }],
            "summary": {"total": 1, "passed": 0, "failed": 1, "errors": 0, "skipped": 0},
            "stdout": f"Error running tests: {str(e)}",
            "stderr": ""
        }

def run_evaluation():
    """Main evaluation function"""
    run_id = str(uuid.uuid4()).replace('-', '')[:8]
    started_at = datetime.utcnow()
    
    print("=" * 60)
    print("Inventory Reservation Evaluation")
    print("=" * 60)
    print("Testing repository_implementation...")
    test_results = run_tests()
    
    finished_at = datetime.utcnow()
    duration_seconds = (finished_at - started_at).total_seconds()
 
    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration_seconds, 5),
        "success": test_results["success"],
        "error": None,
        "environment": environment_info(),
        "results": {
            "after": test_results
        }
    }
    
    return report

def main():
    """Main entry point"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d / %H-%M-%S")
        report_dir = EVAL_DIR / timestamp
        report_dir.mkdir(parents=True, exist_ok=True)

        report = run_evaluation()

        report_file = report_dir / "report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
  
        print("\n" + "=" * 60)
        print("EVALUATION COMPLETE")
        print("=" * 60)
        print(f"Report saved to: {report_file}")
        print(f"Success: {report['success']}")
        print(f"Duration: {report['duration_seconds']} seconds")
        
        if report['success']:
            print("✅ All tests passed!")
            print(f"  Tests passed: {report['results']['after']['summary']['passed']}/{report['results']['after']['summary']['total']}")
        else:
            print("❌ Tests failed")
            print(f"  Tests passed: {report['results']['after']['summary']['passed']}/{report['results']['after']['summary']['total']}")
            
            failed_tests = [t for t in report['results']['after']['tests'] if t['outcome'] == 'failed']
            if failed_tests:
                print(f"  First failure: {failed_tests[0]['name']}")
        
        print("=" * 60)
        
        return 0 if report['success'] else 1
        
    except Exception as e:
        timestamp = datetime.now().strftime("%Y-%m-%d / %H-%M-%S")
        report_dir = EVAL_DIR / timestamp
        report_dir.mkdir(parents=True, exist_ok=True)
        
        error_report = {
            "run_id": str(uuid.uuid4()).replace('-', '')[:8],
            "started_at": datetime.utcnow().isoformat(),
            "finished_at": datetime.utcnow().isoformat(),
            "duration_seconds": 0,
            "success": False,
            "error": str(e),
            "environment": environment_info(),
            "results": {
                "after": {
                    "success": False,
                    "exit_code": 1,
                    "tests": [],
                    "summary": {"total": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
                    "stdout": "",
                    "stderr": ""
                }
            }
        }
        
        report_file = report_dir / "report.json"
        with open(report_file, 'w') as f:
            json.dump(error_report, f, indent=2)
        
        print(f"Evaluation failed: {e}")
        print(f"Error report saved to: {report_file}")
        
        return 1

if __name__ == "__main__":
    sys.exit(main())

