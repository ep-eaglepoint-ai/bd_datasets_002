import json
import os
import subprocess
import sys

def run_tests(repository_path):
    """Run Go tests and return results"""
    try:
        # Store current directory
        original_dir = os.getcwd()
        
        # Check if we're in Docker or on host
        in_docker = os.path.exists('/app/evaluation')
        
        # Determine the correct repository path
        if in_docker:
            # We're in Docker - use container paths
            repo_path = repository_path
            go_cmd = ["go", "test", "-v", "-json", "./..."]
        else:
            # We're on host - use host paths and ensure go is available
            if not os.path.exists(repository_path):
                # Try relative paths if absolute doesn't exist
                repo_path = os.path.join(os.getcwd(), repository_path)
            else:
                repo_path = repository_path
                
            # Check if go is available in PATH
            try:
                subprocess.run(["go", "version"], capture_output=True, check=True)
                go_cmd = ["go", "test", "-v", "-json", "./..."]
            except (subprocess.CalledProcessError, FileNotFoundError):
                # Go not available, try using Docker
                print(f"Go not available on host, using Docker for {repository_path}")
                return run_tests_in_docker(repository_path)
        
        # Change to repository directory
        os.chdir(repo_path)
        
        # Run tests with JSON output
        result = subprocess.run(
            go_cmd,
            capture_output=True,
            text=True,
            cwd=repo_path
        )
        
        # Parse test output
        test_results = []
        passed = 0
        failed = 0
        
        for line in result.stdout.split('\n'):
            if line.strip():
                try:
                    test_event = json.loads(line)
                    if test_event.get("Action") == "pass":
                        passed += 1
                        test_results.append({
                            "name": test_event.get("Test", ""),
                            "status": "PASS",
                            "time": test_event.get("Elapsed", 0)
                        })
                    elif test_event.get("Action") == "fail":
                        failed += 1
                        test_results.append({
                            "name": test_event.get("Test", ""),
                            "status": "FAIL",
                            "time": test_event.get("Elapsed", 0),
                            "error": test_event.get("Output", "")
                        })
                except json.JSONDecodeError:
                    continue
        
        # Return to original directory
        os.chdir(original_dir)
        
        return {
            "total_tests": passed + failed,
            "passed": passed,
            "failed": failed,
            "success_rate": (passed / (passed + failed)) * 100 if (passed + failed) > 0 else 0,
            "test_results": test_results,
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "execution_method": "direct" if not in_docker else "docker"
        }
        
    except Exception as e:
        # Ensure we return to original directory even on error
        try:
            os.chdir(original_dir)
        except:
            pass
        return {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "success_rate": 0,
            "error": str(e),
            "test_results": [],
            "execution_method": "error"
        }

def run_tests_in_docker(repository_path):
    """Run tests using Docker when Go is not available on host"""
    try:
        # Map repository paths for Docker
        docker_repo_path = f"/app/{repository_path}"
        
        # Run Docker command
        docker_cmd = [
            "docker", "run", "--rm",
            "-v", f"{os.getcwd()}:/app",
            "-w", docker_repo_path,
            "hailu3548/jr2pzv-app",
            "go", "test", "-v", "-json", "./..."
        ]
        
        result = subprocess.run(
            docker_cmd,
            capture_output=True,
            text=True
        )
        
        # Parse test output
        test_results = []
        passed = 0
        failed = 0
        
        for line in result.stdout.split('\n'):
            if line.strip():
                try:
                    test_event = json.loads(line)
                    if test_event.get("Action") == "pass":
                        passed += 1
                        test_results.append({
                            "name": test_event.get("Test", ""),
                            "status": "PASS",
                            "time": test_event.get("Elapsed", 0)
                        })
                    elif test_event.get("Action") == "fail":
                        failed += 1
                        test_results.append({
                            "name": test_event.get("Test", ""),
                            "status": "FAIL",
                            "time": test_event.get("Elapsed", 0),
                            "error": test_event.get("Output", "")
                        })
                except json.JSONDecodeError:
                    continue
        
        return {
            "total_tests": passed + failed,
            "passed": passed,
            "failed": failed,
            "success_rate": (passed / (passed + failed)) * 100 if (passed + failed) > 0 else 0,
            "test_results": test_results,
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "execution_method": "docker_fallback"
        }
        
    except Exception as e:
        return {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "success_rate": 0,
            "error": f"Docker fallback failed: {str(e)}",
            "test_results": [],
            "execution_method": "docker_error"
        }

def main():
    """Main evaluation function"""
    # Check if we're in Docker or on host
    in_docker = os.path.exists('/app/evaluation')
    
    if in_docker:
        # We're in Docker container
        project_root = "/app"
        print("Running evaluation in Docker container")
    else:
        # We're on host system
        project_root = os.getcwd()
        print("Running evaluation on host system")
        
        # Check if Go is available
        try:
            subprocess.run(["go", "version"], capture_output=True, check=True)
            print("Go is available on host")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("Go not available on host, will use Docker fallback")
    
    # Run tests for both repositories
    if in_docker:
        before_results = run_tests("/app/repository_before")
        after_results = run_tests("/app/repository_after")
    else:
        before_results = run_tests("repository_before")
        after_results = run_tests("repository_after")
    
    # Create comprehensive report
    report = {
        "evaluation_status": "completed",
        "timestamp": "2024-01-29T00:00:00Z",
        "execution_environment": "docker" if in_docker else "host",
        "repositories": {
            "repository_before": before_results,
            "repository_after": after_results
        },
        "summary": {
            "total_tests_before": before_results["total_tests"],
            "passed_before": before_results["passed"],
            "failed_before": before_results["failed"],
            "total_tests_after": after_results["total_tests"],
            "passed_after": after_results["passed"],
            "failed_after": after_results["failed"],
            "overall_success": before_results["failed"] == 0 and after_results["failed"] == 0
        },
        "requirements_met": {
            "all_tests_executed": before_results["total_tests"] > 0 and after_results["total_tests"] > 0,
            "zero_failures": before_results["failed"] == 0 and after_results["failed"] == 0,
            "report_generated": True
        }
    }
    
    # Ensure evaluation directory exists (host filesystem)
    os.makedirs("evaluation", exist_ok=True)
    os.makedirs("/app/evaluation", exist_ok=True)
    os.makedirs("/tmp/evaluation", exist_ok=True)
    
    # Write JSON report to multiple locations
    report_paths = [
        "evaluation/report.json",  # Primary: Host filesystem location for Aquila
        "/app/evaluation/report.json", 
        "/tmp/evaluation/report.json"
    ]
    
    for report_path in report_paths:
        try:
            # Ensure directory exists for this path
            dir_path = os.path.dirname(report_path)
            os.makedirs(dir_path, exist_ok=True)
            
            with open(report_path, "w") as f:
                json.dump(report, f, indent=2)
            print(f"Report written to: {os.path.abspath(report_path)}")
        except Exception as e:
            print(f"Error writing report to {report_path}: {e}")
    
    # Also create a simple status file for easy detection
    try:
        with open("evaluation/status.txt", "w") as f:
            f.write(f"Evaluation completed: {report['summary']['overall_success']}\n")
            f.write(f"Tests passed: {before_results['passed'] + after_results['passed']}\n")
            f.write(f"Tests failed: {before_results['failed'] + after_results['failed']}\n")
            f.write(f"Environment: {report['execution_environment']}\n")
        print("Status file written to: evaluation/status.txt")
    except Exception as e:
        print(f"Error writing status file: {e}")
    
    # Print current directory and files for debugging
    print(f"Current directory: {os.getcwd()}")
    print(f"Directory contents: {os.listdir('.')}")
    if os.path.exists('evaluation'):
        print(f"Evaluation directory contents: {os.listdir('evaluation')}")
    
    # Also print summary for logs
    print(f"Evaluation completed:")
    print(f"Repository Before: {before_results['passed']}/{before_results['total_tests']} tests passed ({before_results.get('execution_method', 'unknown')})")
    print(f"Repository After: {after_results['passed']}/{after_results['total_tests']} tests passed ({after_results.get('execution_method', 'unknown')})")
    print(f"Overall Status: {'PASS' if report['summary']['overall_success'] else 'FAIL'}")
    print(f"Environment: {report['execution_environment']}")
    print(f"Primary report location: evaluation/report.json (for Aquila platform)")
    
    # Verify the primary report exists and is readable
    try:
        with open("evaluation/report.json", "r") as f:
            test_read = f.read(100)  # Read first 100 chars to verify
        print(f"✅ Primary report verified: evaluation/report.json ({len(test_read)}+ chars)")
    except Exception as e:
        print(f"❌ Primary report verification failed: {e}")

if __name__ == "__main__":
    main()
