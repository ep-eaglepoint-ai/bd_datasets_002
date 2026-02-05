import os
import sys
import json
import uuid
import platform
import subprocess
import datetime
import re

# --- Helper Functions ---

def generate_run_id():
    return uuid.uuid4().hex[:8]

def get_environment_info():
    return {
        "python_version": sys.version.split()[0],
        "platform": platform.platform(),
        "os_type": os.name,
        "execution_mode": "Inside Docker Container",
    }

def generate_output_path(custom_path=None):
    if custom_path:
        return os.path.abspath(custom_path)

    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")

    # Ensure we write to evaluation/reports relative to this script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, "reports", date_str, time_str)

    os.makedirs(output_dir, exist_ok=True)
    return os.path.join(output_dir, "report.json")

def parse_pytest_output(stdout, stderr):
    tests = []
    full_output = stdout + "\n" + stderr
    
    # Remove ANSI color codes
    clean_output = re.sub(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])', '', full_output)
    
    lines = clean_output.split("\n")
    
    # Regex to capture: test_file.py::test_name STATUS
    test_pattern = re.compile(r"(.+?)::(.+?)\s+(PASSED|FAILED|SKIPPED|ERROR)")

    for line in lines:
        line = line.strip()
        match = test_pattern.search(line)
        if match:
            tests.append({
                "suite": match.group(1),
                "name": match.group(2),
                "outcome": "passed" if match.group(3) == "PASSED" else "failed"
            })
            
    return tests

def run_command(command_list):
    start_time = datetime.datetime.now()
    try:
        # We assume we are already in the container, so just run the command
        result = subprocess.run(
            command_list,
            capture_output=True,
            text=True,
            timeout=120
        )
        duration = (datetime.datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "duration_ms": duration
        }
    except Exception as e:
        return {
            "success": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": str(e),
            "duration_ms": 0
        }

def run_evaluation_tests():
    print("🚀 Starting Rate Limiter Evaluation...")
    
    # We run TWO sets of tests:
    # 1. The User's Logic Tests
    # 2. The Meta Tests
    targets = [
        "repository_after/rate_limiter_test.py",
        "tests/test_meta.py"
    ]
    
    combined_tests = []
    combined_stdout = ""
    overall_success = True
    total_duration = 0

    for target in targets:
        print(f"   Executing target: {target}")
        
        # FIX: Always run pytest directly (We are inside the container)
        cmd = ["pytest", "-v", target]

        result = run_command(cmd)
        
        parsed_tests = parse_pytest_output(result["stdout"], result["stderr"])
        combined_tests.extend(parsed_tests)
        
        # Debugging: If no tests found, print output to help user
        if not parsed_tests:
            print(f"⚠️  WARNING: No tests found in {target}. Output was:")
            print(result["stdout"])
            print(result["stderr"])

        combined_stdout += f"\n--- Output for {target} ---\n{result['stdout']}\n{result['stderr']}"
        total_duration += result["duration_ms"]
        
        if not result["success"]:
            overall_success = False

    summary = {
        "total": len(combined_tests),
        "passed": len([t for t in combined_tests if t["outcome"] == "passed"]),
        "failed": len([t for t in combined_tests if t["outcome"] == "failed"]),
        "errors": 1 if not overall_success and len(combined_tests) == 0 else 0
    }

    return {
        "success": overall_success,
        "exit_code": 0 if overall_success else 1,
        "tests": combined_tests,
        "summary": summary,
        "stdout": combined_stdout,
        "duration_ms": total_duration
    }

def map_criteria(tests):
    def check(name_fragments):
        if isinstance(name_fragments, str):
            name_fragments = [name_fragments]
            
        matching_tests = [
            t for t in tests 
            if any(frag.lower() in t["name"].lower() for frag in name_fragments)
        ]
        
        if not matching_tests:
            return "Not Run"
        
        has_failure = any(t["outcome"] == "failed" for t in matching_tests)
        return "Fail" if has_failure else "Pass"

    return {
        # --- User Implementation Criteria (Req 1-10) ---
        "Req_1_First_Request": check("test_req_1"),
        "Req_2_Increments": check("test_req_2"),
        "Req_3_Limit_Exceeded": check("test_req_3"),
        "Req_4_Window_Reset": check("test_req_4"),
        "Req_5_Validate_Remaining": check(["test_req_1", "test_req_2", "test_req_3", "test_req_4"]),
        "Req_6_Validate_Reset_Time": check(["test_req_1", "test_req_3"]),
        "Req_7_Store_Interactions": check(["test_req_1", "test_req_2"]),
        "Req_8_TTL_Values": check(["test_req_1", "test_req_8"]),
        "Req_9_Invalid_Config": check("test_req_9"),
        "Req_10_Missing_Keys": check("test_req_10"),
        
        # --- Meta Test Criteria (Mutation Testing) ---
        # These now check if your suite correctly PASSED against valid code 
        # and correctly FAILED against the 4 broken implementations.
        "Meta_Suite_Valid_Code":      check("test_passes_against_correct_code"),
        "Meta_Catch_Infinite_Bug":    check("test_fails_against_infinite_allowance"),
        "Meta_Catch_Window_Bug":      check("test_fails_against_broken_window_reset"),
        "Meta_Catch_TTL_Bug":         check("test_fails_against_broken_ttl"),
        "Meta_Catch_Validation_Bug":  check("test_fails_against_broken_validation")
    }

def main():
    run_id = generate_run_id()
    
    results = run_evaluation_tests()
    criteria_analysis = map_criteria(results["tests"])

    report = {
        "run_id": run_id,
        "tool": "Rate Limiter Evaluator",
        "started_at": datetime.datetime.utcnow().isoformat() + "Z",
        "environment": get_environment_info(),
        "before": None,
        "after": results,
        "criteria_analysis": criteria_analysis,
        "comparison": {
            "summary": "Containerized Evaluation",
            "success": results["success"]
        }
    }

    output_path = generate_output_path()
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    print("\n---------------------------------------------------")
    print(f"Tests Run: {results['summary']['total']}")
    print(f"Passed:    {results['summary']['passed']}")
    print(f"Failed:    {results['summary']['failed']}")
    print("---------------------------------------------------")
    print(f"✅ Report saved to: {output_path}")
    
    sys.exit(0 if results["success"] else 1)

if __name__ == "__main__":
    main()