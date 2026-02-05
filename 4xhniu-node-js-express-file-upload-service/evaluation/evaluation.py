import os
import json
import subprocess
import time
import uuid
import platform
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Define project root
ROOT = Path(__file__).parent.parent.resolve()
REPORTS = ROOT / "evaluation" / "reports"

def environment_info() -> Dict[str, str]:
    """Gather environment information."""
    return {
        "python_version": platform.python_version(),
        "platform": f"{platform.system()} {platform.release()}",
        "go_version": get_go_version()
    }

def get_go_version() -> str:
    """Get Go version."""
    try:
        result = subprocess.run(
            ["go", "version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.stdout:
            return result.stdout.split('\n')[0].strip()
        return "unknown"
    except Exception:
        return "unknown"

def run_tests(repo_path: Path) -> Dict[str, Any]:
    """Run Go tests for a specific repository state."""
    test_result = {
        "passed": False,
        "return_code": 1,
        "output": "",
        "tests_run": 0,
        "failures": 0,
        "errors": 0,
        "skipped": 0
    }
    
    if not repo_path.exists():
        test_result["output"] = f"Repository path does not exist: {repo_path}"
        return test_result
    
    # Run tests directly in the root since we rely on go.work and module paths
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_root = Path(temp_dir)
        try:
            # 1. Copy repository_after
            target_repo = temp_root / "repository_after"
            source_repo = ROOT / "repository_after"
            if source_repo.exists():
                shutil.copytree(source_repo, target_repo)
            
            # 2. Copy tests
            target_tests = temp_root / "tests"
            source_tests = ROOT / "tests"
            if source_tests.exists():
                shutil.copytree(source_tests, target_tests)

            # 3. Copy go.work if it exists
            target_work = temp_root / "go.work"
            source_work = ROOT / "go.work"
            if source_work.exists():
                shutil.copy(source_work, target_work)

        except Exception as e:
            test_result["output"] = f"Failed to prepare test environment: {str(e)}"
            return test_result

        cmd = ["go", "test", "-v", "./tests/..."]
        
        try:
            result = subprocess.run(
                cmd,
                cwd=temp_root,
                capture_output=True,
                text=True,
                timeout=240
            )
            
            output = result.stdout + result.stderr
            test_result["return_code"] = result.returncode
            
            if len(output) > 20000:
                output = output[:4000] + "\n...[truncated]...\n" + output[-16000:]
            
            test_result["output"] = output
            
            stats = parse_go_test_output(output)
            test_result.update(stats)

            test_result["passed"] = (result.returncode == 0)
            
        except subprocess.TimeoutExpired:
            test_result["output"] = "Test execution timed out after 240 seconds"
        except Exception as e:
            test_result["output"] = f"Execution failed: {str(e)}"

    return test_result

def parse_go_test_output(output: str) -> Dict[str, int]:
    """Parse Go test output for stats."""
    stats = {"tests_run": 0, "failures": 0, "errors": 0, "skipped": 0}
    
    # Generic Go test output parsing
    stats["tests_run"] = output.count("=== RUN")
    stats["failures"] = output.count("--- FAIL:")
    stats["skipped"] = output.count("--- SKIP:")
    
    if "build failed" in output:
        stats["errors"] = 1
        
    return stats

def run_metrics(repo_path: Path) -> Dict[str, Any]:
    """Calculate complexity metrics for Go files."""
    metrics = {
        "go_file_count": 0,
        "lines_of_code": 0,
        "error": None
    }
    
    if not repo_path.exists():
        return metrics
    
    try:
        for go_file in repo_path.rglob("*.go"):
            if "test" in str(go_file).lower():
                continue
                
            metrics["go_file_count"] += 1
            try:
                with open(go_file, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = [l.strip() for l in f.readlines() if l.strip()]
                    metrics["lines_of_code"] += len(lines)
            except Exception:
                pass
    except Exception as e:
        metrics["error"] = str(e)
    
    return metrics

def evaluate(repo_name: str) -> Dict[str, Any]:
    repo_path = ROOT / repo_name
    return {
        "tests": run_tests(ROOT), # Execution context is ROOT
        "metrics": run_metrics(repo_path)
    }

def print_report(report: Dict[str, Any], report_path: Path):
    print("=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print()
    print(f"Run ID: {report['run_id']}")
    print(f"Duration: {report['duration_seconds']:.2f} seconds")
    print()
    
    # Report only 'after'
    for stage in ["after"]:
        data = report[stage]
        tests = data["tests"]
        print(f"{stage.upper()} ({'repository_' + stage}):")
        print(f"  Tests passed: {tests['passed']}")
        print(f"  Tests run:    {tests['tests_run']}")
        print(f"  Failures:     {tests['failures']}")
        print(f"  Errors:       {tests['errors']}")
        print(f"  Files:        {data['metrics']['go_file_count']}")
        print(f"  LOC:          {data['metrics']['lines_of_code']}")
        print()
    
    print("SUMMARY:")
    print(f"  Passed gate: {report['comparison']['passed_gate']}")
    print(f"  Message:     {report['comparison']['improvement_summary']}")
    print()
    print("=" * 60)
    print(f"SUCCESS: {report['success']}")
    print("=" * 60)
    print(f"Report written to {report_path}")

def main():
    run_id = str(uuid.uuid4())
    start_time = time.time()
    
    print("Starting evaluation...")
    
    # 1. Evaluate 'repository_after' (Implementation) ONLY
    after = evaluate("repository_after")
    
    # 2. Determine success
    passed_gate = after["tests"]["passed"]
    
    comparison = {
        "passed_gate": passed_gate,
        "improvement_summary": "Tests passed" if passed_gate else "Tests failed"
    }
    
    duration = time.time() - start_time
    
    report = {
        "run_id": run_id,
        "timestamp": datetime.now().isoformat(),
        "duration_seconds": duration,
        "environment": environment_info(),
        "after": after,
        "comparison": comparison,
        "success": passed_gate
    }
    
    # Save Report
    date_str = datetime.now().strftime("%Y-%m-%d")
    time_str = datetime.now().strftime("%H-%M-%S")
    report_dir = REPORTS / date_str / time_str
    report_dir.mkdir(parents=True, exist_ok=True)
    
    report_path = report_dir / "report.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
        
    print_report(report, report_path)
    
    exit(0 if report["success"] else 1)

if __name__ == "__main__":
    main()
