import os
import sys
import time
import subprocess
import json
import requests
import traceback
from datetime import datetime

# Add the parent directory to sys.path so we can import tests
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from tests.test_requirements import run_all_tests, BASE_URL
except ImportError:
    # If it fails to import, we will try to handle it in main
    pass

REPORT_FILE = os.path.join(os.path.dirname(__file__), 'report.json')
LOG_FILE = os.path.join(os.path.dirname(__file__), 'evaluation.log')

def log_message(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, 'a') as f:
        f.write(f"[{timestamp}] {message}\n")
    print(message)

def run_evaluation():
    log_message("Starting Evaluation Process")
    
    metrics = {
        "timestamp": datetime.now().isoformat(),
        "total_requirements": 17,
        "passed": 0,
        "failed": 0,
        "total_time_seconds": 0,
        "results": [],
        "errors": []
    }
    
    start_time = time.time()
    
    # 1. Start the server (select based on APP_VERSION env var)
    app_version = os.environ.get("APP_VERSION", "after")
    repo_dir = "repository_after" if app_version == "after" else "repository_before"
    server_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', repo_dir, 'calculator.go'))
    log_message(f"Starting {app_version} server: go run {server_path}")
    
    server_process = None
    try:
        server_process = subprocess.Popen(
            ["go", "run", server_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=os.path.dirname(server_path)
        )
        
        # 2. Wait for server to be ready
        ready = False
        for _ in range(30): # Wait up to 30 seconds
            try:
                response = requests.get("http://localhost:8080", timeout=1)
                if response.status_code == 200:
                    ready = True
                    log_message("Server is ready")
                    break
            except:
                time.sleep(1)
        
        if not ready:
            log_message("CRITICAL: Server failed to start in time")
            metrics["errors"].append("Server timeout")
            return metrics

        # 3. Run tests
        log_message("Executing requirement tests...")
        results = run_all_tests()
        
        # 4. Process results
        for r in results:
            metrics["results"].append({
                "req_id": r.requirement_id,
                "name": r.name,
                "passed": r.passed,
                "details": r.details
            })
            if r.passed:
                metrics["passed"] += 1
            else:
                metrics["failed"] += 1
                
    except Exception as e:
        log_message(f"ERROR during evaluation: {e}")
        log_message(traceback.format_exc())
        metrics["errors"].append(str(e))
    finally:
        # 5. Stop the server
        if server_process:
            log_message("Stopping server...")
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()
    
    metrics["total_time_seconds"] = time.time() - start_time
    log_message(f"Evaluation complete. Passed: {metrics['passed']}/{metrics['total_requirements']}")
    
    # 6. Write report
    with open(REPORT_FILE, 'w') as f:
        json.dump(metrics, f, indent=4)
    log_message(f"Report generated at {REPORT_FILE}")
    
    return metrics

def main():
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)
        
    run_evaluation()

if __name__ == "__main__":
    main()
