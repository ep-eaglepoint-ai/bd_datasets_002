import os
import json
import subprocess
import time
import uuid
import platform
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

ROOT = Path(__file__).parent.parent.resolve()
REPORTS = ROOT / "evaluation" / "reports"

def environment_info() -> Dict[str, str]:
    return {
        "python_version": platform.python_version(),
        "platform": f"{platform.system()} {platform.release()}"
    }

def run_tests(repo_path: Path) -> Dict[str, Any]:
    test_result = {
        "passed": False,
        "return_code": 1,
        "output": "",
        "tests_run": 0,
        "failures": 0,
        "errors": 0,
        "skipped": 0
    }
    
    # We assume we are running this script LOCALLY or inside the container?
    # The prompt says "docker compose run evaluation".
    # And "implemenet evaluation.py"
    # Usually this script runs the build/test commands.
    
    cmd = ["go", "test", "-v", "./tests/..."]
    
    # If running inside Docker, cwd is /app.
    # We should run go test from /app.
    
    try:
        # Check if go is installed (it should be in the container)
        subprocess.run(["go", "version"], check=True, capture_output=True)
        
        result = subprocess.run(
            cmd,
            cwd=ROOT, # /app in docker
            capture_output=True,
            text=True,
            timeout=240
        )
        
        output = result.stdout + result.stderr
        test_result["return_code"] = result.returncode
        test_result["output"] = output
        
        # Parse Go Test Output
        # Example: 
        # === RUN   TestRequirements
        # --- PASS: TestRequirements (0.01s)
        # PASS
        # ok  	file-upload-service/tests	0.014s
        
        if "FAIL" in output:
             test_result["failures"] = output.count("FAIL")
        else:
             test_result["failures"] = 0
             
        if "PASS" in output:
             test_result["passed"] = True
             test_result["tests_run"] = output.count("=== RUN")
        
        # Adjust passed logic
        if result.returncode == 0:
            test_result["passed"] = True
        else:
            test_result["passed"] = False
            
    except Exception as e:
        test_result["output"] = f"Execution failed: {str(e)}"

    return test_result

def evaluate(repo_name: str) -> Dict[str, Any]:
    # We only have repository_after in this scenario relevant for go test
    return {
        "tests": run_tests(ROOT),
        "metrics": {"loc": 0} # Placeholder
    }

def main():
    report = evaluate("repository_after")
    
    # Print results to stdout for user visibility
    print(json.dumps(report, indent=2))
    
    # Write to file
    report_path = REPORTS / "latest.json"
    if not report_path.parent.exists():
        report_path.parent.mkdir(parents=True)
        
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

if __name__ == "__main__":
    main()
