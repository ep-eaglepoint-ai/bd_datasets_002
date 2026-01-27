#!/usr/bin/env python3
import os
import sys
import json
import uuid
import platform
import subprocess
from datetime import datetime
from pathlib import Path


def generate_run_id():
    """Generate a short unique run ID."""
    return uuid.uuid4().hex[:8]


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


def run_java_test(target_dir, label):
    """
    Run Java tests for the specified target directory using Maven.

    Args:
        target_dir: The target repository directory (e.g., "repository_before")
        label: Label for this test run (e.g., "before")

    Returns:
        dict with test results
    """
    print(f"\n{'=' * 60}")
    print(f"RUNNING TESTS: {label.upper()}")
    print(f"{'=' * 60}")
    print(f"TARGET_REPOSITORY: {target_dir}")

    # Build Maven commands
    # 1. Clean src/main/java
    # 2. Copy target_repo contents to src/main/java/com/example/gamestats/
    # 3. Add package declaration if missing (since repo files might not have it or have it matching)
    #    Checked: repo files have `package com.example.gamestats;`
    # 4. Compile and Run
    
    # Python script logic to move files
    # Note: We are inside the container at /app
    
    src_path = Path("src/main/java/com/example/gamestats")
    target_path = Path(target_dir)
    
    if src_path.exists():
        import shutil
        shutil.rmtree(src_path)
    src_path.mkdir(parents=True, exist_ok=True)
    
    # Copy java files
    if target_path.exists():
        for java_file in target_path.glob("*.java"):
             import shutil
             shutil.copy(java_file, src_path / java_file.name)
    else:
        print(f"Warning: {target_dir} does not exist!")

    # Copy the latest JavaTestRunner from tests/ folder to ensure we use the updated version
    test_src_path = Path("src/test/java/com/example/gamestats")
    test_src_path.mkdir(parents=True, exist_ok=True)
    runner_source = Path("tests/JavaTestRunner.java")
    if runner_source.exists():
        import shutil
        shutil.copy(runner_source, test_src_path / "JavaTestRunner.java")
    else:
         print("Warning: tests/JavaTestRunner.java not found in /app!")

    # Maven command to compile and run the JavaTestRunner
    # We use exec:java. JavaTestRunner has main method.
    # Classpath scope test includes src/test/java and dependencies.
    mvn_cmd = "mvn test-compile exec:java -Dexec.mainClass=com.example.gamestats.JavaTestRunner -Dexec.classpathScope=test -q"
    
    print(f"Executing: {mvn_cmd}")

    try:
        # Measure time
        start_time = datetime.now()
        
        # Capture both stdout/stderr. -q creates less noise, but we want the output of Runner.
        result = subprocess.run(
            ["sh", "-c", mvn_cmd],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        duration_ms = (datetime.now() - start_time).total_seconds() * 1000

        stdout = result.stdout
        stderr = result.stderr
        
        # Maven might fail (compilation error) or JavaTestRunner might exit 1
        success = result.returncode == 0
        
        # Parse output to mimic individual tests
        tests = []
        
        # Treat execution as the main test
        main_test_outcome = "passed" if success else "failed"
        
        # Try to parse execution time from stdout if available
        exec_time_str = "unknown"
        for line in stdout.splitlines():
            if "Execution Time:" in line:
                exec_time_str = line.strip()
        
        tests.append({
            "nodeid": f"{target_dir}::JavaTestRunner",
            "name": "JavaTestRunner",
            "outcome": main_test_outcome,
            "call": {
                "duration": duration_ms,
                "msg": exec_time_str
            }
        })

        # Count results
        passed = 1 if success else 0
        failed = 0 if success else 1
        errors = 0
        skipped = 0
        total = 1

        print(f"\nResults: {passed} passed, {failed} failed, {errors} errors, {skipped} skipped (total: {total})")
        print(f"Output:\n{stdout}")
        if stderr and not success:
            print(f"Errors:\n{stderr}")
        
        return {
            "success": success,
            "exit_code": result.returncode,
            "tests": tests,
            "summary": {
                "total": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "skipped": skipped,
            },
            "stdout": stdout[-3000:] if len(stdout) > 3000 else stdout,
            "stderr": stderr[-1000:] if len(stderr) > 1000 else stderr,
        }
        
    except subprocess.TimeoutExpired:
        print("❌ Test execution timed out")
        return {
            "success": False,
            "exit_code": -1,
            "tests": [{"nodeid": f"{target_dir}::JavaTestRunner", "name": "JavaTestRunner", "outcome": "error", "message": "Result timed out"}],
            "summary": {"total": 1, "passed": 0, "failed": 0, "errors": 1, "skipped": 0, "error": "Test execution timed out"},
            "stdout": "",
            "stderr": "",
        }
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return {
            "success": False,
            "exit_code": -1,
            "tests": [{"nodeid": f"{target_dir}::JavaTestRunner", "name": "JavaTestRunner", "outcome": "error", "message": str(e)}],
            "summary": {"total": 1, "passed": 0, "failed": 0, "errors": 1, "skipped": 0, "error": str(e)},
            "stdout": "",
            "stderr": "",
        }

def run_evaluation(target=None):
    """
    Run complete evaluation for both implementations.
    
    Args:
        target: Optional target to run ('before', 'after'). If None, runs both.

    Returns dict with test results from both before and after implementations.
    """
    print(f"\n{'=' * 60}")
    print("Football Stats EVALUATION")
    print(f"{'=' * 60}")
    
    before_results = {"success": False, "summary": {"total": 0}}
    after_results = {"success": False, "summary": {"total": 0}}
    
    run_before = target is None or target == "before"
    run_after = target is None or target == "after"

    if run_before:
        # Run tests with BEFORE implementation
        before_results = run_java_test(
            "repository_before",
            "before (repository_before)"
        )
    
    if run_after:
        # Run tests with AFTER implementation
        after_results = run_java_test(
            "repository_after",
            "after (repository_after)"
        )
    
    # Build comparison
    comparison = {
        "before_tests_passed": before_results.get("success", False),
        "after_tests_passed": after_results.get("success", False),
        "before_total": before_results.get("summary", {}).get("total", 0),
        "before_passed": before_results.get("summary", {}).get("passed", 0),
        "before_failed": before_results.get("summary", {}).get("failed", 0),
        "after_total": after_results.get("summary", {}).get("total", 0),
        "after_passed": after_results.get("summary", {}).get("passed", 0),
        "after_failed": after_results.get("summary", {}).get("failed", 0),
    }
    
    # Print summary
    print(f"\n{'=' * 60}")
    print("EVALUATION SUMMARY")
    print(f"{'=' * 60}")
    
    if run_before:
        print(f"\nBefore Implementation (repository_before):")
        print(f"  Overall: {'✅ PASSED' if before_results.get('success') else '❌ FAILED (Expected)'}")
    
    if run_after:
        print(f"\nAfter Implementation (repository_after):")
        print(f"  Overall: {'✅ PASSED' if after_results.get('success') else '❌ FAILED'}")
    
    # Determine expected behavior
    print(f"\n{'=' * 60}")
    print("EXPECTED BEHAVIOR CHECK")
    print(f"{'=' * 60}")
    
    if run_before:
        before_failed_as_expected = not before_results.get("success")
        if before_failed_as_expected:
             print("✅ Before implementation: Failed as expected (Performance check)")
        else:
             print("⚠️ Before implementation: Passed (Unexpected - check baseline latency)")

    if run_after:
        after_passed_as_expected = after_results.get("success")
        if after_passed_as_expected:
            print("✅ After implementation: All tests passed (expected)")
        else:
            print("❌ After implementation: Tests failed (unexpected)")
    
    return {
        "before": before_results,
        "after": after_results,
        "comparison": comparison,
    }


def generate_output_path():
    """Generate output path in format: evaluation/YYYY-MM-DD/HH-MM-SS/report.json"""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    
    project_root = Path(__file__).parent.parent
    output_dir = project_root / "evaluation" / date_str / time_str
    output_dir.mkdir(parents=True, exist_ok=True)
    
    return output_dir / "report.json"


def main():
    """Main entry point for evaluation."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run mechanical refactor evaluation")
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output JSON file path (default: evaluation/YYYY-MM-DD/HH-MM-SS/report.json)"
    )
    parser.add_argument(
        "--target",
        type=str,
        choices=["before", "after"],
        help="Specific target to run (default: both)"
    )
    
    args = parser.parse_args()
    
    # Generate run ID and timestamps
    run_id = generate_run_id()
    started_at = datetime.now()
    
    print(f"Run ID: {run_id}")
    print(f"Started at: {started_at.isoformat()}")
    
    try:
        results = run_evaluation(target=args.target)
        
        # Success logic depends on what run:
        # If running just LAST implementation (after), it must pass.
        # If running BOTH: after must pass.
        # If running BEFORE: we generally expect failure but return 0 or 1?
        # Usually test runners strictly return 0 only on pass.
        # However, before is EXPECTED to fail.
        
        if args.target == 'before':
            success = not results["before"].get("success", False) # Success if it fails as expected? Or strict test?
            # Standard: Docker commands return exit code of the test.
            # If I run test-before, and it fails, docker exit code is 1.
            # This is correct for "verifying failure".
            success = results["before"].get("success", False)
        elif args.target == 'after':
             success = results["after"].get("success", False)
        else:
             # Running entire evaluation
             success = results["after"].get("success", False)

        error_message = None if success else "Tests failed"

    except Exception as e:
        import traceback
        print(f"\nERROR: {str(e)}")
        traceback.print_exc()
        results = None
        success = False
        error_message = str(e)

    finished_at = datetime.now()
    duration = (finished_at - started_at).total_seconds()

    # Collect environment information
    environment = get_environment_info()

    # Build report
    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 6),
        "success": success,
        "error": error_message,
        "environment": environment,
        "results": results,
    }

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = generate_output_path()

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n✅ Report saved to: {output_path}")

    print(f"\n{'=' * 60}")
    print(f"EVALUATION COMPLETE")
    print(f"{'=' * 60}")
    print(f"Run ID: {run_id}")
    print(f"Duration: {duration:.2f}s")
    print(f"Success: {'✅ YES' if success else '❌ NO'}")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())