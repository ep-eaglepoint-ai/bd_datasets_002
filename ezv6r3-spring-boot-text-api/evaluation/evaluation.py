#!/usr/bin/env python3
import os
import sys
import json
import uuid
import platform
import subprocess
import shutil
import re
from datetime import datetime
from pathlib import Path

# --- Configuration ---
JAVA_PACKAGE_PATH = Path("src/main/java/com/example/textapi")
CONTROLLER_FILE = "TextProcessingController.java"

def generate_run_id():
    return uuid.uuid4().hex[:8]

def get_environment_info():
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "java_version": subprocess.getoutput("java -version 2>&1").split('\n')[0],
        "maven_version": subprocess.getoutput("mvn -version").split('\n')[0]
    }

def generate_output_path():
    """
    Generates the path: evaluation/YYYY-MM-DD/HH-MM-SS/report.json
    Relative to the current working directory (/app in Docker).
    """
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    
    # This creates evaluation/2024-01-01/12-00-00/report.json
    return Path("evaluation") / date_str / time_str / "report.json"

def parse_maven_output(output):
    """Parses 'mvn test' output to find passed/failed counts."""
    summary = {"total": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0}
    
    match = re.search(r"Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)", output)
    if match:
        total = int(match.group(1))
        failures = int(match.group(2))
        errors = int(match.group(3))
        skipped = int(match.group(4))
        summary = {
            "total": total,
            "failed": failures,
            "errors": errors,
            "skipped": skipped,
            "passed": total - failures - errors - skipped
        }
    return [], summary

def run_maven_test(source_repo_path, label):
    print(f"\n{'=' * 60}")
    print(f"RUNNING TESTS: {label.upper()}")
    print(f"{'=' * 60}")
    
    source_dir = Path(source_repo_path)
    
    if not source_dir.exists():
        return {"success": False, "summary": {"error": f"Source directory not found: {source_dir}"}}

    # Copy all .java files from the source repository
    java_files = list(source_dir.glob("*.java"))
    if not java_files:
        return {"success": False, "summary": {"error": f"No .java files found in: {source_dir}"}}
    
    # Clean up existing .java files (except TextApiApplication.java which is mounted from tests/)
    for existing_file in JAVA_PACKAGE_PATH.glob("*.java"):
        if existing_file.name != "TextApiApplication.java":
            existing_file.unlink()
    
    for source_file in java_files:
        # Skip TextApiApplication.java as it's mounted from tests/ directory
        if source_file.name == "TextApiApplication.java":
            continue
        dest_file = JAVA_PACKAGE_PATH / source_file.name
        print(f"Copying {source_file} -> {dest_file}")
        shutil.copy(source_file, dest_file)

    cmd = ["mvn", "test", "-Dtest=TextProcessingControllerTest"]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        tests, summary = parse_maven_output(result.stdout)
        success = (result.returncode == 0)
        
        print(f"Result: {'✅ SUCCESS' if success else '❌ FAILURE'}")
        return {
            "success": success,
            "exit_code": result.returncode,
            "summary": summary,
            "stdout": result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout,
            "stderr": result.stderr[-1000:] if len(result.stderr) > 1000 else result.stderr,
        }
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"success": False, "summary": {"error": str(e)}}

def run_evaluation():
    # Ensure Java Package Structure Exists
    JAVA_PACKAGE_PATH.mkdir(parents=True, exist_ok=True)

    before_results = run_maven_test("repository_before", "before (repository_before)")
    after_results = run_maven_test("repository_after", "after (repository_after)")

    comparison = {
        "before_passed": before_results.get("success", False),
        "after_passed": after_results.get("success", False),
    }

    return {
        "before": before_results,
        "after": after_results,
        "comparison": comparison
    }

def main():
    run_id = generate_run_id()
    started_at = datetime.now()
    
    results = run_evaluation()
    
    finished_at = datetime.now()
    duration = (finished_at - started_at).total_seconds()
    
    # Success if After passes
    overall_success = results["after"].get("success", False)

    report = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 2),
        "success": overall_success,
        "environment": get_environment_info(),
        "results": results
    }
    
    # Generate timestamped path
    output_path = generate_output_path()
    
    # Create the directory structure (e.g., evaluation/2023-10-10/10-10-10)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
        
    print(f"\n✅ Report saved to: {output_path}")
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())