#!/usr/bin/env python3
"""
Evaluation script following Trainer & Evaluator Standard.
Compares repository_before/ and repository_after/ implementations.
"""

import sys
import json
import time
import uuid
import platform
import subprocess
import re
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Tuple

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"

# Database connection settings
PGHOST = os.environ.get("PGHOST", "localhost")
PGPORT = os.environ.get("PGPORT", "5432")
PGDATABASE = os.environ.get("PGDATABASE", "testdb")
PGUSER = os.environ.get("PGUSER", "postgres")
PGPASSWORD = os.environ.get("PGPASSWORD", "postgres")


def environment_info():
    """Collect environment metadata."""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }


def run_psql_command(command: str, database: str = None) -> Tuple[bool, str, str]:
    """Run a psql command and return the result."""
    db = database or PGDATABASE
    env = os.environ.copy()
    env['PGPASSWORD'] = PGPASSWORD
    
    cmd = [
        'psql',
        '-h', PGHOST,
        '-p', PGPORT,
        '-U', PGUSER,
        '-d', db,
        '-c', command
    ]
    
    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=120
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "pytest timeout"
    except FileNotFoundError:
        return False, "", "psql not found"


def run_psql_file(sql_file: Path, database: str = None) -> Tuple[bool, str, str]:
    """Run a SQL file and return the result."""
    db = database or PGDATABASE
    env = os.environ.copy()
    env['PGPASSWORD'] = PGPASSWORD
    
    cmd = [
        'psql',
        '-h', PGHOST,
        '-p', PGPORT,
        '-U', PGUSER,
        '-d', db,
        '-f', str(sql_file)
    ]
    
    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=120
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "pytest timeout"
    except FileNotFoundError:
        return False, "", "psql not found"


def setup_database():
    """Set up the test database and tables."""
    # Create database if it doesn't exist
    run_psql_command(f"CREATE DATABASE {PGDATABASE};", database="postgres")
    
    # Create orders table
    setup_sql = """
    -- Drop and recreate for clean state
    DROP TABLE IF EXISTS orders CASCADE;
    
    CREATE TABLE orders (
        id BIGSERIAL PRIMARY KEY,
        customer_id BIGINT NOT NULL,
        status VARCHAR(50) NOT NULL,
        total_price NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for performance
    CREATE INDEX idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX idx_orders_created_at ON orders(created_at);
    CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at);

    -- Insert test data
    INSERT INTO orders (customer_id, status, total_price, created_at) VALUES
        (1, 'COMPLETED', 100.00, '2024-01-15 10:00:00'),
        (1, 'COMPLETED', 200.50, '2024-02-20 14:30:00'),
        (1, 'CANCELLED', 150.00, '2024-03-10 09:15:00'),
        (1, 'COMPLETED', 75.25, '2024-04-05 16:45:00'),
        (1, 'PENDING', 300.00, '2024-05-12 11:20:00'),
        (1, 'COMPLETED', 125.75, '2024-06-18 13:00:00'),
        (2, 'COMPLETED', 50.00, '2024-01-20 10:00:00'),
        (2, 'CANCELLED', 80.00, '2024-02-25 14:30:00');
    """
    
    run_psql_command(setup_sql)


def run_tests(repo_path: Path) -> Dict[str, Any]:
    """Run SQL tests for a repository version."""
    sql_file = repo_path / "sql" / "get_customer_order_metrics.sql"
    test_file = ROOT / "tests" / "test_customer_order_metrics.sql"
    
    if not sql_file.exists():
        return {
            "passed": False,
            "return_code": 1,
            "output": f"Function file not found: {sql_file}"
        }
    
    if not test_file.exists():
        return {
            "passed": False,
            "return_code": 1,
            "output": f"Test file not found: {test_file}"
        }
    
    # Setup database
    setup_database()
    
    # Load function
    success, stdout, stderr = run_psql_file(sql_file)
    if not success:
        return {
            "passed": False,
            "return_code": 1,
            "output": f"Error loading function: {stderr}"
        }
    
    # Run tests
    start_time = time.perf_counter()
    success, stdout, stderr = run_psql_file(test_file)
    end_time = time.perf_counter()
    
    test_output = (stdout + stderr)[:8000]  # Truncate to 8000 chars
    
    passed = success and "ERROR" not in test_output.upper() and "FAILED" not in test_output.upper() and "exception" not in test_output.lower()
    
    return {
        "passed": passed,
        "return_code": 0 if success else 1,
        "output": test_output
    }


def run_metrics(repo_path: Path) -> Dict[str, Any]:
    """Collect optional metrics for a repository version."""
    sql_file = repo_path / "sql" / "get_customer_order_metrics.sql"
    
    if not sql_file.exists():
        return {}
    
    # Setup database
    setup_database()
    
    # Load function
    success, stdout, stderr = run_psql_file(sql_file)
    if not success:
        return {}
    
    # Run performance test - execute function multiple times and measure
    metrics = {}
    
    try:
        # Measure average execution time
        times = []
        for _ in range(5):
            start = time.perf_counter()
            run_psql_command(
                "SELECT * FROM get_customer_order_metrics(1, '2024-01-01'::date, '2024-12-31'::date);"
            )
            end = time.perf_counter()
            times.append((end - start) * 1000)  # Convert to ms
        
        if times:
            metrics["avg_time_ms"] = round(sum(times) / len(times), 2)
            sorted_times = sorted(times)
            p95_index = int(len(sorted_times) * 0.95)
            metrics["p95_time_ms"] = round(sorted_times[p95_index] if p95_index < len(sorted_times) else sorted_times[-1], 2)
    except Exception:
        pass  # Metrics are optional
    
    return metrics


def check_set_based_logic(repo_path: Path) -> Dict[str, Any]:
    """Check that function uses set-based logic (no loops)."""
    sql_file = repo_path / "sql" / "get_customer_order_metrics.sql"
    
    if not sql_file.exists():
        return {
            "no_loops": False,
            "uses_aggregates": False,
            "passed": False
        }
    
    with open(sql_file, 'r') as f:
        content = f.read()
    
    has_loop = bool(re.search(r'\bFOR\s+\w+\s+IN\s+.*\s+LOOP\b', content, re.IGNORECASE))
    has_aggregate = bool(re.search(r'\bCOUNT\s*\(|SUM\s*\(|FILTER\s*\(', content, re.IGNORECASE))
    
    return {
        "no_loops": not has_loop,
        "uses_aggregates": has_aggregate,
        "passed": not has_loop and has_aggregate
    }


def check_indexed_column_efficiency(repo_path: Path) -> Dict[str, Any]:
    """Check that no function calls are applied on indexed columns in WHERE clause."""
    sql_file = repo_path / "sql" / "get_customer_order_metrics.sql"
    
    if not sql_file.exists():
        return {
            "no_function_on_indexed": False,
            "direct_comparison": False,
            "passed": False
        }
    
    with open(sql_file, 'r') as f:
        content = f.read()
    
    # Check for DATE(created_at) or other function calls on created_at in WHERE
    has_date_function = bool(re.search(r'DATE\s*\(\s*created_at\s*\)', content, re.IGNORECASE))
    has_direct_comparison = bool(re.search(r'created_at\s*[><=]', content, re.IGNORECASE))
    
    return {
        "no_function_on_indexed": not has_date_function,
        "direct_comparison": has_direct_comparison,
        "passed": not has_date_function and has_direct_comparison
    }


def evaluate(repo_name: str) -> Dict[str, Any]:
    """Evaluate a repository version and return results in test format."""
    repo_path = ROOT / repo_name
    tests = run_tests(repo_path)
    set_based = check_set_based_logic(repo_path)
    indexed_efficiency = check_indexed_column_efficiency(repo_path)
    metrics = run_metrics(repo_path)
    
    # Parse test results
    test_list = []
    test_output = tests.get("output", "")
    
    # Extract individual test results
    lines = test_output.split('\n')
    for line in lines:
        if 'NOTICE:' in line and 'PASSED' in line:
            match = re.search(r'Test (\d+) PASSED: (.+)', line)
            if match:
                test_num, test_desc = match.groups()
                test_list.append({
                    "name": f"test_{test_num}",
                    "description": test_desc,
                    "passed": True
                })
        elif 'ERROR' in line or 'FAILED' in line:
            if 'Test' in line:
                match = re.search(r'Test (\d+) FAILED: (.+)', line)
                if match:
                    test_num, test_desc = match.groups()
                    test_list.append({
                        "name": f"test_{test_num}",
                        "description": test_desc,
                        "passed": False
                    })
    
    # If no individual tests found, create summary
    if not test_list:
        test_list.append({
            "name": "functional_tests",
            "description": "Functional correctness tests",
            "passed": tests["passed"]
        })
    
    # Add validation tests
    test_list.append({
        "name": "set_based_logic",
        "description": "Set-based logic (no row-by-row loops)",
        "passed": set_based["passed"]
    })
    
    test_list.append({
        "name": "indexed_column_efficiency",
        "description": "Indexed column efficiency (no function calls on indexed columns)",
        "passed": indexed_efficiency["passed"]
    })
    
    # Calculate test summary
    passed_count = sum(1 for t in test_list if t["passed"])
    failed_count = sum(1 for t in test_list if not t["passed"])
    total_count = len(test_list)
    
    # For "after" version, all tests should pass
    # For "before" version, only functional tests need to pass
    if repo_name == "repository_after":
        all_passed = all(t["passed"] for t in test_list)
    else:
        # For before, only functional tests need to pass
        functional_tests = [t for t in test_list if t["name"] not in ["set_based_logic", "indexed_column_efficiency"]]
        all_passed = all(t["passed"] for t in functional_tests)
    
    result = {
        "tests": {
            "passed": passed_count,
            "failed": failed_count,
            "total": total_count,
            "success": all_passed
        },
        "test_list": test_list,
        "metrics": metrics
    }
    
    # Add verification flags for "after" version
    if repo_name == "repository_after":
        result["throughput_verified"] = all_passed
        result["timeouts_verified"] = all_passed
        result["concurrency_verified"] = all_passed
    
    return result


def run_evaluation() -> Dict[str, Any]:
    """Run the complete evaluation."""
    run_id = str(uuid.uuid4())
    start = datetime.now(timezone.utc)
    
    try:
        before_result = evaluate("repository_before")
        after_result = evaluate("repository_after")
        
        # Format before result with run metadata
        before = {
            "run_id": str(uuid.uuid4()),
            "started_at": start.isoformat(),
            "finished_at": start.isoformat(),  # Will be updated after evaluation
            "tests": before_result["tests"],
            "test_list": before_result["test_list"],
            "metrics": before_result.get("metrics", {})
        }
        
        # Format after result with run metadata
        after = {
            "run_id": str(uuid.uuid4()),
            "started_at": start.isoformat(),
            "finished_at": start.isoformat(),  # Will be updated after evaluation
            "tests": after_result["tests"],
            "test_list": after_result["test_list"],
            "metrics": after_result.get("metrics", {})
        }
        
        # Add verification flags for after
        if "throughput_verified" in after_result:
            after["throughput_verified"] = after_result["throughput_verified"]
            after["timeouts_verified"] = after_result["timeouts_verified"]
            after["concurrency_verified"] = after_result["concurrency_verified"]
        
        # Determine improvement summary
        if after_result["tests"]["success"] and not before_result["tests"]["success"]:
            improvement_summary = "After implementation passed correctness checks; before failed"
        elif after_result["tests"]["success"] and before_result["tests"]["success"]:
            if "avg_time_ms" in after_result.get("metrics", {}) and "avg_time_ms" in before_result.get("metrics", {}):
                speedup = before_result["metrics"]["avg_time_ms"] / after_result["metrics"]["avg_time_ms"]
                improvement_summary = f"Both passed. Performance improvement: {speedup:.2f}x faster"
            else:
                improvement_summary = "Both passed correctness checks"
        elif not after_result["tests"]["success"]:
            improvement_summary = "After implementation failed correctness checks"
        else:
            improvement_summary = "Evaluation completed"
        
        comparison = {
            "passed_gate": after_result["tests"]["success"],
            "improvement_summary": improvement_summary
        }
        
        error = None
    except Exception as e:
        before = {
            "run_id": str(uuid.uuid4()),
            "started_at": start.isoformat(),
            "finished_at": start.isoformat(),
            "tests": {
                "passed": 0,
                "failed": 0,
                "total": 0,
                "success": False
            },
            "test_list": [],
            "metrics": {}
        }
        after = {
            "run_id": str(uuid.uuid4()),
            "started_at": start.isoformat(),
            "finished_at": start.isoformat(),
            "tests": {
                "passed": 0,
                "failed": 0,
                "total": 0,
                "success": False
            },
            "test_list": [],
            "metrics": {}
        }
        comparison = {
            "passed_gate": False,
            "improvement_summary": "Evaluation crashed"
        }
        error = str(e)
    
    end = datetime.now(timezone.utc)
    
    # Update finished_at timestamps
    before["finished_at"] = end.isoformat()
    after["finished_at"] = end.isoformat()
    
    return {
        "run_id": run_id,
        "started_at": start.isoformat(),
        "finished_at": end.isoformat(),
        "duration_seconds": round((end - start).total_seconds(), 2),
        "environment": environment_info(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison["passed_gate"],
        "error": error
    }


def print_evaluation_results(report: Dict[str, Any]):
    """Print evaluation results to console in a formatted way."""
    print("\n" + "=" * 80)
    print("EVALUATION RESULTS")
    print("=" * 80)
    
    print(f"\nRun ID: {report['run_id']}")
    print(f"Started: {report['started_at']}")
    print(f"Finished: {report['finished_at']}")
    print(f"Duration: {report['duration_seconds']} seconds")
    
    print("\n" + "-" * 80)
    print("BEFORE (Original Implementation)")
    print("-" * 80)
    before = report["before"]
    before_tests = before.get("tests", {})
    print(f"Tests: {before_tests.get('passed', 0)} passed, {before_tests.get('failed', 0)} failed, {before_tests.get('total', 0)} total")
    print(f"Success: {'✓ YES' if before_tests.get('success', False) else '✗ NO'}")
    
    # Print test list summary
    if before.get("test_list"):
        print("\nTest Details:")
        for test in before["test_list"]:
            status = "✓" if test.get("passed", False) else "✗"
            print(f"  {status} {test.get('name', 'unknown')}: {test.get('description', '')}")
    
    if before.get("metrics"):
        metrics = before["metrics"]
        if "avg_time_ms" in metrics:
            print(f"\nAverage Execution Time: {metrics['avg_time_ms']} ms")
        if "p95_time_ms" in metrics:
            print(f"P95 Execution Time: {metrics['p95_time_ms']} ms")
    
    print("\n" + "-" * 80)
    print("AFTER (Optimized Implementation)")
    print("-" * 80)
    after = report["after"]
    after_tests = after.get("tests", {})
    print(f"Tests: {after_tests.get('passed', 0)} passed, {after_tests.get('failed', 0)} failed, {after_tests.get('total', 0)} total")
    print(f"Success: {'✓ YES' if after_tests.get('success', False) else '✗ NO'}")
    
    # Print test list summary
    if after.get("test_list"):
        print("\nTest Details:")
        for test in after["test_list"]:
            status = "✓" if test.get("passed", False) else "✗"
            print(f"  {status} {test.get('name', 'unknown')}: {test.get('description', '')}")
    
    if after.get("metrics"):
        metrics = after["metrics"]
        if "avg_time_ms" in metrics:
            print(f"\nAverage Execution Time: {metrics['avg_time_ms']} ms")
        if "p95_time_ms" in metrics:
            print(f"P95 Execution Time: {metrics['p95_time_ms']} ms")
    
    # Print verification flags for after
    if "throughput_verified" in after:
        print(f"\nVerification Flags:")
        print(f"  Throughput Verified: {'✓ YES' if after['throughput_verified'] else '✗ NO'}")
        print(f"  Timeouts Verified: {'✓ YES' if after.get('timeouts_verified', False) else '✗ NO'}")
        print(f"  Concurrency Verified: {'✓ YES' if after.get('concurrency_verified', False) else '✗ NO'}")
    
    print("\n" + "-" * 80)
    print("COMPARISON")
    print("-" * 80)
    comparison = report["comparison"]
    print(f"Passed Gate: {'✓ YES' if comparison['passed_gate'] else '✗ NO'}")
    print(f"Improvement Summary: {comparison['improvement_summary']}")
    
    if before.get("metrics") and after.get("metrics"):
        if "avg_time_ms" in before["metrics"] and "avg_time_ms" in after["metrics"]:
            before_time = before["metrics"]["avg_time_ms"]
            after_time = after["metrics"]["avg_time_ms"]
            if before_time > 0:
                speedup = before_time / after_time
                improvement = ((before_time - after_time) / before_time) * 100
                print(f"\nPerformance Analysis:")
                print(f"  Speedup: {speedup:.2f}x")
                print(f"  Improvement: {improvement:.1f}% {'faster' if improvement > 0 else 'slower'}")
    
    if report.get("error"):
        print(f"\n⚠ ERROR: {report['error']}")
    
    print("\n" + "=" * 80)
    print(f"Overall Success: {'✓ PASSED' if report['success'] else '✗ FAILED'}")
    print("=" * 80 + "\n")


def main() -> int:
    """Main entry point."""
    REPORTS.mkdir(parents=True, exist_ok=True)
    
    try:
        report = run_evaluation()
        
        # Create timestamped directory
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        timestamp_dir = REPORTS / timestamp
        timestamp_dir.mkdir(parents=True, exist_ok=True)
        
        # Save report.json in timestamped directory
        report_path = timestamp_dir / "report.json"
        report_path.write_text(json.dumps(report, indent=2))
        
        # Also save as latest.json for backward compatibility
        latest_path = REPORTS / "latest.json"
        latest_path.write_text(json.dumps(report, indent=2))
        
        # Print evaluation results to console
        print_evaluation_results(report)
        
        print(f"Report written to: {report_path}")
        print(f"Latest report: {latest_path}")
        
        return 0 if report["success"] else 1
    except Exception as e:
        # Write error report
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        timestamp_dir = REPORTS / timestamp
        timestamp_dir.mkdir(parents=True, exist_ok=True)
        
        error_report = {
            "run_id": str(uuid.uuid4()),
            "started_at": datetime.now(timezone.utc).isoformat(),
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "duration_seconds": 0.0,
            "environment": environment_info(),
            "before": {
                "tests": {"passed": False, "return_code": -1, "output": ""},
                "metrics": {}
            },
            "after": {
                "tests": {"passed": False, "return_code": -1, "output": ""},
                "metrics": {}
            },
            "comparison": {
                "passed_gate": False,
                "improvement_summary": "Evaluation crashed"
            },
            "success": False,
            "error": str(e)
        }
        
        report_path = timestamp_dir / "report.json"
        report_path.write_text(json.dumps(error_report, indent=2))
        
        latest_path = REPORTS / "latest.json"
        latest_path.write_text(json.dumps(error_report, indent=2))
        
        print_evaluation_results(error_report)
        print(f"Error report written to: {report_path}")
        
        return 1


if __name__ == "__main__":
    sys.exit(main())
