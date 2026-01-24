
import os
import sys
import json
import uuid
import subprocess
import platform
import datetime
import shutil
import re

def get_formatted_date():
    return datetime.datetime.now().strftime("%Y-%m-%d")

def ensure_directory(path):
    if not os.path.exists(path):
        os.makedirs(path)

def run_tests():
    start_time = datetime.datetime.now(datetime.timezone.utc)
    
    cmd = [sys.executable, "-m", "pytest", "tests/test_solution.py", "-v"]
    print(f"Running: {' '.join(cmd)}")
    
    # We need PYTHONPATH to include current directory
    env = os.environ.copy()
    env["PYTHONPATH"] = os.getcwd()
    
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    stdout, stderr = process.communicate()
    end_time = datetime.datetime.now(datetime.timezone.utc)
    duration = (end_time - start_time).total_seconds()
    
    exit_code = process.returncode
    
    # Parse output
    summary = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "xfailed": 0,
        "errors": 0,
        "skipped": 0
    }
    
    # Regex to clean ANSI codes
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    stdout_clean = ansi_escape.sub('', stdout)
    
    # Parse output - search for summary line near the end
    lines = stdout_clean.strip().split('\n')
    
    # Iterate from end to find summary line
    summary_line = None
    for line in reversed(lines):
        if "passed" in line or "failed" in line or "no tests ran" in line:
            summary_line = line.strip()
            break
            
    if summary_line:
        patterns = {
            "passed": r'(\d+)\s+passed',
            "failed": r'(\d+)\s+failed',
            "skipped": r'(\d+)\s+skipped',
            "xfailed": r'(\d+)\s+xfailed',
            "errors": r'(\d+)\s+error'
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, summary_line)
            if match:
                summary[key] = int(match.group(1))

    result_tests = []
    summary["total"] = sum(summary.values())
    
    return {
        "success": exit_code == 0,
        "exit_code": exit_code,
        "tests": result_tests,
        "summary": summary,
        "duration": duration
    }

def main():
    print("Starting evaluation...")
    
    run_id = str(uuid.uuid4())
    start_time_iso = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    start_timer = datetime.datetime.now()
    
    try:
        test_result = run_tests()
        
        end_time_iso = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
        end_timer = datetime.datetime.now()
        total_duration = (end_timer - start_timer).total_seconds()
        
        node_version = "N/A" # Python environment
        
        report = {
            "run_id": run_id,
            "started_at": start_time_iso,
            "finished_at": end_time_iso,
            "duration_seconds": total_duration,
            "success": test_result["success"],
            "error": None if test_result["success"] else "Tests failed",
            "environment": {
                "node_version": node_version,
                "platform": platform.system().lower(),
                "os": platform.system(),
                "architecture": platform.machine(),
                "hostname": platform.node()
            },
            "results": {
                "after": {
                    "success": test_result["success"],
                    "exit_code": test_result["exit_code"],
                    "tests": test_result["tests"],
                    "summary": test_result["summary"]
                },
                "comparison": {
                    "after_tests_passed": test_result["success"],
                    "after_total": test_result["summary"]["total"],
                    "after_passed": test_result["summary"]["passed"],
                    "after_failed": test_result["summary"]["failed"],
                    "after_xfailed": test_result["summary"]["xfailed"]
                }
            }
        }
        
        # Write report
        # Write report
        now = datetime.datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H-%M-%S")
        output_dir = os.path.join(os.path.dirname(__file__), date_str, time_str)
        ensure_directory(output_dir)
        output_path = os.path.join(output_dir, "report.json")
        
        with open(output_path, "w") as f:
            json.dump(report, f, indent=2)
            
        print(f"Report generated at: {output_path}")
        print(json.dumps(report, indent=2))
        
    except Exception as e:
        print(f"Evaluation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
