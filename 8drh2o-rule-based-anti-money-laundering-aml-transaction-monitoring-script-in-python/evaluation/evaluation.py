import json
import os
import platform
import subprocess
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path

def get_environment_info():
    return {
        "python_version": sys.version.split()[0],
        "platform": sys.platform,
        "os": platform.system(),
        "architecture": platform.machine(),
        "hostname": platform.node()
    }

def run_tests():
    # Use pytest to run tests and output to a JSON file
    # We'll use a temporary file for the pytest-json-report if possible, 
    # but since it might not be installed, we'll try to use a minimal approach.
    # Actually, let's use a simple pytest plugin defined in-line to capture results.
    
    report_data = {
        "tests": [],
        "summary": {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "xfailed": 0,
            "errors": 0,
            "skipped": 0
        }
    }

    # We'll run pytest with a custom plugin to capture results in JSON
    plugin_code = """
import pytest
from datetime import datetime

class JsonReportPlugin:
    def __init__(self):
        self.results = []
        self.summary = {"total": 0, "passed": 0, "failed": 0, "xfailed": 0, "errors": 0, "skipped": 0}

    def pytest_runtest_logreport(self, report):
        if report.when == 'call' or (report.when == 'setup' and report.failed):
            status = report.outcome
            if report.passed:
                status = "passed"
            elif report.failed:
                status = "failed"
            elif report.skipped:
                status = "skipped"
            
            # Handle xfail
            if hasattr(report, 'wasxfail'):
                status = "xfailed"
                self.summary["xfailed"] += 1
            else:
                if status == "passed": self.summary["passed"] += 1
                elif status == "failed": self.summary["failed"] += 1
                elif status == "skipped": self.summary["skipped"] += 1
            
            if report.when == 'setup' and report.failed:
                self.summary["errors"] += 1
                status = "error"

            self.results.append({
                "name": report.nodeid,
                "status": status,
                "duration": int(report.duration * 1000), # in milliseconds
                "failureMessages": [str(report.longrepr)] if report.failed else []
            })
            self.summary["total"] += 1

def pytest_configure(config):
    config._json_report = JsonReportPlugin()
    config.pluginmanager.register(config._json_report)

def pytest_unconfigure(config):
    import json
    with open('pytest_results.json', 'w') as f:
        json.dump({"tests": config._json_report.results, "summary": config._json_report.summary}, f)
"""
    
    with open('pytest_collector.py', 'w') as f:
        f.write(plugin_code)

    try:
        # Run tests in the tests/ directory
        env = os.environ.copy()
        env["PYTHONPATH"] = f".{os.pathsep}{env.get('PYTHONPATH', '')}"
        subprocess.run(["pytest", "-p", "pytest_collector", "tests/"], capture_output=True, text=True, env=env)
        
        if os.path.exists('pytest_results.json'):
            with open('pytest_results.json', 'r') as f:
                report_data = json.load(f)
            os.remove('pytest_results.json')
    except Exception as e:
        print(f"Error running tests: {e}")
    finally:
        if os.path.exists('pytest_collector.py'):
            os.remove('pytest_collector.py')

    return report_data

def main():
    start_time = datetime.utcnow()
    started_at = start_time.isoformat() + "Z"
    
    run_id = str(uuid.uuid4())
    
    test_results = run_tests()
    
    end_time = datetime.utcnow()
    finished_at = end_time.isoformat() + "Z"
    duration_seconds = (end_time - start_time).total_seconds()
    
    after_summary = test_results["summary"]
    after_tests_passed = (after_summary["failed"] == 0 and after_summary["errors"] == 0)
    
    report = {
        "run_id": run_id,
        "started_at": started_at,
        "finished_at": finished_at,
        "duration_seconds": duration_seconds,
        "success": after_tests_passed,
        "error": None,
        "environment": get_environment_info(),
        "results": {
            "after": {
                "success": after_tests_passed,
                "exit_code": 0 if after_tests_passed else 1,
                "tests": test_results["tests"],
                "summary": after_summary
            }
        },
        "comparison": {
            "after_tests_passed": after_tests_passed,
            "after_total": after_summary["total"],
            "after_passed": after_summary["passed"],
            "after_failed": after_summary["failed"],
            "after_xfailed": after_summary["xfailed"]
        }
    }
    
    # Path: evaluation/yyyy-mm-dd/hh-mm-ss/report.json
    now = datetime.now()
    date_dir = now.strftime("%Y-%m-%d")
    time_dir = now.strftime("%H-%M-%S")
    
    report_dir = Path("evaluation") / date_dir / time_dir
    report_dir.mkdir(parents=True, exist_ok=True)
    
    report_path = report_dir / "report.json"
    
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"Report generated at {report_path}")

if __name__ == "__main__":
    main()
