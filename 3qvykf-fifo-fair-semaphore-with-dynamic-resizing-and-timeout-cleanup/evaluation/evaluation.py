import os
import subprocess
import json
import sys
from datetime import datetime

def run_tests():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    repo_after = os.path.join(project_root, "repository_after")
    tests_dir = os.path.join(project_root, "tests")
    
    # Set PYTHONPATH so tests can find the implementation
    env = os.environ.copy()
    env["PYTHONPATH"] = repo_after + os.pathsep + env.get("PYTHONPATH", "")
    
    print("============================================================")
    print("RUNNING EVALUATION: AFTER")
    print("============================================================")
    
    # Run pytest and capture output
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "--verbose", tests_dir],
        env=env,
        capture_output=True,
        text=True
    )
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
        
    passed = result.returncode == 0
    
    # Basic report structure
    report = {
        "timestamp": datetime.now().isoformat(),
        "success": passed,
        "summary": {
            "total_tests": 10, # Hardcoded for now based on file content
            "passed": result.stdout.count("PASSED"),
            "failed": result.stdout.count("FAILED")
        },
        "output": result.stdout,
        "error": result.stderr if not passed else None
    }
    
    # Create reports directory
    reports_dir = os.path.join(project_root, "evaluation", "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    # Timestamped subfolder
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    report_folder = os.path.join(reports_dir, date_str, time_str)
    os.makedirs(report_folder, exist_ok=True)
    
    report_path = os.path.join(report_folder, "report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
        

    print("\n============================================================")
    print("EVALUATION COMPLETE")
    print("============================================================")
    print(f"Success: {'✅ YES' if passed else '❌ NO'}")
    print(f"Report saved to: {report_path}")
    
    sys.exit(result.returncode)

if __name__ == "__main__":
    run_tests()
