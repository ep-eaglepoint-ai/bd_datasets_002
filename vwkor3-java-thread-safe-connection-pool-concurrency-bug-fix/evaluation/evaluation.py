import os
import json
import subprocess
import time
import uuid
import platform
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional


ROOT = Path(__file__).parent.parent.resolve()
REPORTS = ROOT / "evaluation" / "reports"


def environment_info() -> Dict[str, str]:
    """Gather environment information."""
    return {
        "python_version": platform.python_version(),
        "platform": f"{platform.system()} {platform.release()}",
        "java_version": get_java_version()
    }


def get_java_version() -> str:
    """Get Java version."""
    try:
        result = subprocess.run(
            ["java", "-version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        # Java version is in stderr
        version_line = result.stderr.split('\n')[0]
        return version_line.strip()
    except Exception:
        return "unknown"


def run_tests(repo_path: Path) -> Dict[str, Any]:
    """Run Maven tests for a repository."""
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
    
    # Ensure Maven standard layout for sources
    try:
        src_main_pool = repo_path / "src" / "main" / "java" / "pool"
        src_main_pool.mkdir(parents=True, exist_ok=True)

        legacy_pool = repo_path / "pool"
        if legacy_pool.exists():
            for item in legacy_pool.iterdir():
                target = src_main_pool / item.name
                if not target.exists():
                    item.replace(target)
            # Remove legacy pool directory if empty
            try:
                legacy_pool.rmdir()
            except OSError:
                pass
    except Exception:
        # Proceed even if restructuring fails; Maven may still compile depending on POM
        pass

    # Copy tests to the repository
    tests_src = ROOT / "tests" / "test_connection_pool.java"
    test_dest = repo_path / "src" / "test" / "java" / "pool"
    test_dest.mkdir(parents=True, exist_ok=True)
    
    try:
        import shutil
        shutil.copy(tests_src, test_dest / "ConnectionPoolTest.java")
    except Exception as e:
        test_result["output"] = f"Failed to copy test file: {str(e)}"
        return test_result
    
    # Run Maven clean test
    cmd = ["mvn", "clean", "test"]
    
    try:
        result = subprocess.run(
            cmd,
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        output = result.stdout + result.stderr
        test_result["return_code"] = result.returncode
        test_result["passed"] = result.returncode == 0
        
        # Truncate output if too long
        if len(output) > 20000:
            output = output[:4000] + "\n...[truncated]...\n" + output[-16000:]
        
        test_result["output"] = output
        
        # Parse Maven test output
        stats = parse_maven_output(output)
        test_result.update(stats)
        
    except subprocess.TimeoutExpired:
        test_result["output"] = "Test execution timed out after 120 seconds"
    except Exception as e:
        test_result["output"] = f"Test execution failed: {str(e)}"
    
    return test_result


def parse_maven_output(output: str) -> Dict[str, int]:
    """Parse Maven test output to extract test statistics."""
    stats = {
        "tests_run": 0,
        "failures": 0,
        "errors": 0,
        "skipped": 0
    }
    
    # Look for patterns like "Tests run: 8, Failures: 0, Errors: 0, Skipped: 0"
    for line in output.split('\n'):
        if "Tests run:" in line:
            try:
                parts = line.split(',')
                for part in parts:
                    if "Tests run:" in part:
                        stats["tests_run"] = int(part.split(':')[1].strip())
                    elif "Failures:" in part:
                        stats["failures"] = int(part.split(':')[1].strip())
                    elif "Errors:" in part:
                        stats["errors"] = int(part.split(':')[1].strip())
                    elif "Skipped:" in part:
                        stats["skipped"] = int(part.split(':')[1].strip())
            except (ValueError, IndexError):
                pass
    
    return stats


def run_metrics(repo_path: Path) -> Dict[str, Any]:
    """Calculate metrics for Java files in repository."""
    metrics = {
        "java_file_count": 0,
        "lines_of_code": 0,
        "error": None
    }
    
    if not repo_path.exists():
        return metrics
    
    try:
        for java_file in repo_path.rglob("*.java"):
            # Skip test files
            if "/test/" in str(java_file) or "\\test\\" in str(java_file):
                continue
                
            metrics["java_file_count"] += 1
            try:
                with open(java_file, 'r', encoding='utf-8', errors='ignore') as f:
                    metrics["lines_of_code"] += len(f.readlines())
            except Exception:
                pass
    except Exception as e:
        metrics["error"] = str(e)
    
    return metrics


def evaluate(repo_name: str) -> Dict[str, Any]:
    """Evaluate a repository."""
    repo_path = ROOT / repo_name
    
    tests = run_tests(repo_path)
    metrics = run_metrics(repo_path)
    
    return {
        "tests": tests,
        "metrics": metrics
    }


def print_report(report: Dict[str, Any], report_path: Path):
    """Print evaluation report to console."""
    print("=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print()
    print(f"Run ID: {report['run_id']}")
    print(f"Duration: {report['duration_seconds']:.2f} seconds")
    print()
    
    # Before results
    before = report["before"]
    before_tests = before["tests"]
    print("BEFORE (repository_before):")
    print(f"  Tests passed: {before_tests['passed']}")
    print(f"  Tests run: {before_tests['tests_run']}")
    print(f"  Failures: {before_tests['failures']}")
    print(f"  Errors: {before_tests['errors']}")
    print(f"  Return code: {before_tests['return_code']}")
    
    # After results
    after = report["after"]
    after_tests = after["tests"]
    print()
    print("AFTER (repository_after):")
    print(f"  Tests passed: {after_tests['passed']}")
    print(f"  Tests run: {after_tests['tests_run']}")
    print(f"  Failures: {after_tests['failures']}")
    print(f"  Errors: {after_tests['errors']}")
    print(f"  Return code: {after_tests['return_code']}")
    
    # Comparison
    comparison = report["comparison"]
    print()
    print("COMPARISON:")
    print(f"  Passed gate: {comparison['passed_gate']}")
    print(f"  Summary: {comparison['improvement_summary']}")
    
    # Metrics
    print()
    print("METRICS (repository_after):")
    print(f"  Java files: {after['metrics']['java_file_count']}")
    print(f"  Lines of code: {after['metrics']['lines_of_code']}")
    
    print()
    print("=" * 60)
    print(f"SUCCESS: {report['success']}")
    print("=" * 60)
    print()
    print(f"Report written to {report_path}")


def main():
    """Main evaluation function."""
    run_id = str(uuid.uuid4())
    start_time = time.time()
    start_dt = datetime.now()
    
    print("Starting evaluation...")
    print()
    
    # Evaluate before and after
    before = evaluate("repository_before")
    after = evaluate("repository_after")
    
    # Determine success: after tests must pass
    passed_gate = after["tests"]["passed"]
    
    # Additional check: tests should actually run
    if after["tests"]["tests_run"] == 0:
        passed_gate = False
    
    comparison = {
        "passed_gate": passed_gate,
        "improvement_summary": "Requirements verification passed" if passed_gate else "Requirements verification failed",
        "before_passed": before["tests"]["passed"],
        "after_passed": after["tests"]["passed"],
        "test_improvement": after["tests"]["tests_run"] - after["tests"]["failures"] - after["tests"]["errors"]
    }
    
    end_time = time.time()
    end_dt = datetime.now()
    duration_seconds = end_time - start_time
    
    # Build report
    report = {
        "run_id": run_id,
        "started_at": start_dt.isoformat(),
        "finished_at": end_dt.isoformat(),
        "duration_seconds": duration_seconds,
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": passed_gate,
        "error": None
    }
    
    # Save report
    date_str = start_dt.strftime("%Y-%m-%d")
    time_str = start_dt.strftime("%H-%M-%S")
    report_dir = REPORTS / date_str / time_str
    report_dir.mkdir(parents=True, exist_ok=True)
    
    report_path = report_dir / "report.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print report
    print_report(report, report_path)
    
    # Exit with appropriate code
    exit(0 if report["success"] else 1)


if __name__ == "__main__":
    main()
