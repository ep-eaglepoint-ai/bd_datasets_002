"""
Evaluation script for the Go High-Throughput Idempotent Dispatcher.
Runs tests and generates detailed metrics in JSON format.
"""

import subprocess
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent.absolute()


def run_go_tests(repo_dir: Path) -> Dict[str, Any]:
    """
    Run Go tests and collect detailed metrics.
    """
    result = {
        "framework": "go_test",
        "directory": str(repo_dir),
        "start_time": datetime.now().isoformat(),
        "end_time": None,
        "duration_seconds": 0,
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "test_results": [],
        "overall_status": "error",
        "error": None,
        "stdout": "",
        "stderr": "",
    }
    
    if not (repo_dir / "go.mod").exists():
        result["error"] = f"No go.mod found in {repo_dir}"
        result["end_time"] = datetime.now().isoformat()
        return result
    
    start_time = time.time()
    
    try:
        # Run go test with verbose JSON output
        process = subprocess.run(
            ["go", "test", "-v", "-race", "-json", "./..."],
            cwd=str(repo_dir),
            capture_output=True,
            text=True,
            timeout=180,
        )
        
        result["stdout"] = process.stdout
        result["stderr"] = process.stderr
        
        # Parse JSON output
        test_details = {}
        
        for line in process.stdout.strip().split("\n"):
            if not line:
                continue
            try:
                entry = json.loads(line)
                test_name = entry.get("Test", "")
                action = entry.get("Action", "")
                elapsed = entry.get("Elapsed", 0)
                output = entry.get("Output", "")
                
                if test_name:
                    if test_name not in test_details:
                        test_details[test_name] = {
                            "name": test_name,
                            "status": "running",
                            "duration_seconds": 0,
                            "output": [],
                        }
                    
                    if action == "pass":
                        test_details[test_name]["status"] = "passed"
                        test_details[test_name]["duration_seconds"] = elapsed
                    elif action == "fail":
                        test_details[test_name]["status"] = "failed"
                        test_details[test_name]["duration_seconds"] = elapsed
                    elif action == "skip":
                        test_details[test_name]["status"] = "skipped"
                    elif action == "output" and output:
                        test_details[test_name]["output"].append(output.strip())
                        
            except json.JSONDecodeError:
                continue
        
        # Aggregate results
        for test in test_details.values():
            test["output"] = "\n".join(test["output"])
            result["test_results"].append(test)
            
            if test["status"] == "passed":
                result["passed"] += 1
            elif test["status"] == "failed":
                result["failed"] += 1
            elif test["status"] == "skipped":
                result["skipped"] += 1
        
        result["total_tests"] = len(test_details)
        result["overall_status"] = "passed" if process.returncode == 0 else "failed"
        
    except subprocess.TimeoutExpired:
        result["error"] = "Tests timed out after 180 seconds"
        result["overall_status"] = "timeout"
    except FileNotFoundError:
        result["error"] = "Go not found in PATH"
        result["overall_status"] = "error"
    except Exception as e:
        result["error"] = str(e)
        result["overall_status"] = "error"
    
    result["duration_seconds"] = time.time() - start_time
    result["end_time"] = datetime.now().isoformat()
    
    return result


def run_python_tests(tests_dir: Path) -> Dict[str, Any]:
    """
    Run Python meta-tests and collect metrics.
    """
    result = {
        "framework": "pytest",
        "directory": str(tests_dir),
        "start_time": datetime.now().isoformat(),
        "end_time": None,
        "duration_seconds": 0,
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "test_results": [],
        "overall_status": "error",
        "error": None,
        "stdout": "",
        "stderr": "",
    }
    
    start_time = time.time()
    
    try:
        # Run pytest with JSON report
        process = subprocess.run(
            [sys.executable, "-m", "pytest", "-v", "--tb=short", str(tests_dir)],
            capture_output=True,
            text=True,
            timeout=120,
        )
        
        result["stdout"] = process.stdout
        result["stderr"] = process.stderr
        
        # Parse pytest output
        for line in process.stdout.split("\n"):
            if "::" in line and (" PASSED" in line or " FAILED" in line or " SKIPPED" in line):
                test_name = line.split("::")[1].split()[0] if "::" in line else line
                status = "passed" if "PASSED" in line else ("failed" if "FAILED" in line else "skipped")
                
                result["test_results"].append({
                    "name": test_name,
                    "status": status,
                    "output": line,
                })
                
                if status == "passed":
                    result["passed"] += 1
                elif status == "failed":
                    result["failed"] += 1
                else:
                    result["skipped"] += 1
        
        result["total_tests"] = result["passed"] + result["failed"] + result["skipped"]
        result["overall_status"] = "passed" if process.returncode == 0 else "failed"
        
    except subprocess.TimeoutExpired:
        result["error"] = "Tests timed out after 120 seconds"
        result["overall_status"] = "timeout"
    except Exception as e:
        result["error"] = str(e)
        result["overall_status"] = "error"
    
    result["duration_seconds"] = time.time() - start_time
    result["end_time"] = datetime.now().isoformat()
    
    return result


def check_code_structure(repo_dir: Path) -> Dict[str, Any]:
    """
    Verify the code structure meets requirements.
    """
    result = {
        "has_event_model": (repo_dir / "event.go").exists(),
        "has_store_interface": (repo_dir / "store.go").exists(),
        "has_memory_store": (repo_dir / "memory_store.go").exists(),
        "has_orchestrator": (repo_dir / "orchestrator.go").exists(),
        "has_retry_policy": (repo_dir / "retry.go").exists(),
        "has_tests": (repo_dir / "dispatcher_test.go").exists(),
        "has_go_mod": (repo_dir / "go.mod").exists(),
    }
    result["structure_complete"] = all(result.values())
    return result


def main():
    """Main evaluation entry point."""
    print("=" * 60)
    print("Go High-Throughput Idempotent Dispatcher - Evaluation")
    print("=" * 60)
    
    project_root = get_project_root()
    repo_after = project_root / "repository_after"
    tests_dir = project_root / "tests"
    evaluation_dir = project_root / "evaluation"
    
    # Initialize metrics
    metrics = {
        "evaluation_time": datetime.now().isoformat(),
        "instance_id": "Y67YP7",
        "overall_status": "pending",
        "structure_check": {},
        "go_tests": {},
        "python_meta_tests": {},
        "summary": {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "total_duration_seconds": 0,
        },
        "error_logs": [],
    }
    
    print("\n[1/4] Checking code structure...")
    metrics["structure_check"] = check_code_structure(repo_after)
    if metrics["structure_check"]["structure_complete"]:
        print("  ✓ All required files present")
    else:
        missing = [k for k, v in metrics["structure_check"].items() if not v and k != "structure_complete"]
        print(f"  ✗ Missing: {missing}")
    
    print("\n[2/4] Running Go tests in repository_after...")
    metrics["go_tests"] = run_go_tests(repo_after)
    print(f"  Status: {metrics['go_tests']['overall_status']}")
    print(f"  Passed: {metrics['go_tests']['passed']}/{metrics['go_tests']['total_tests']}")
    print(f"  Duration: {metrics['go_tests']['duration_seconds']:.2f}s")
    
    if metrics["go_tests"]["error"]:
        metrics["error_logs"].append(f"Go tests error: {metrics['go_tests']['error']}")
    
    print("\n[3/4] Running Python meta-tests...")
    metrics["python_meta_tests"] = run_python_tests(tests_dir)
    print(f"  Status: {metrics['python_meta_tests']['overall_status']}")
    print(f"  Passed: {metrics['python_meta_tests']['passed']}/{metrics['python_meta_tests']['total_tests']}")
    print(f"  Duration: {metrics['python_meta_tests']['duration_seconds']:.2f}s")
    
    if metrics["python_meta_tests"]["error"]:
        metrics["error_logs"].append(f"Python tests error: {metrics['python_meta_tests']['error']}")
    
    # Calculate summary
    metrics["summary"]["total_tests"] = (
        metrics["go_tests"]["total_tests"] + 
        metrics["python_meta_tests"]["total_tests"]
    )
    metrics["summary"]["passed"] = (
        metrics["go_tests"]["passed"] + 
        metrics["python_meta_tests"]["passed"]
    )
    metrics["summary"]["failed"] = (
        metrics["go_tests"]["failed"] + 
        metrics["python_meta_tests"]["failed"]
    )
    metrics["summary"]["total_duration_seconds"] = (
        metrics["go_tests"]["duration_seconds"] + 
        metrics["python_meta_tests"]["duration_seconds"]
    )
    
    # Determine overall status
    all_passed = (
        metrics["structure_check"]["structure_complete"] and
        metrics["go_tests"]["overall_status"] == "passed" and
        metrics["python_meta_tests"]["overall_status"] == "passed"
    )
    metrics["overall_status"] = "passed" if all_passed else "failed"
    
    print("\n[4/4] Writing metrics to file...")
    evaluation_dir.mkdir(parents=True, exist_ok=True)
    metrics_file = evaluation_dir / "report.json"
    with open(metrics_file, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  Metrics saved to: {metrics_file}")
    
    print("\n" + "=" * 60)
    print(f"OVERALL STATUS: {metrics['overall_status'].upper()}")
    print(f"Total Tests: {metrics['summary']['total_tests']}")
    print(f"Passed: {metrics['summary']['passed']}")
    print(f"Failed: {metrics['summary']['failed']}")
    print(f"Duration: {metrics['summary']['total_duration_seconds']:.2f}s")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
