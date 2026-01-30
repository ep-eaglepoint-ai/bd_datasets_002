import json
import subprocess
import datetime
import os
import re

print("============================================================")
print("Circuit Breaker - Evaluation")
print("============================================================\n")


def parse_pytest_output(output: str) -> dict:
    """Parse pytest verbose output to extract individual test results."""
    tests = {}

    # Match patterns like "test_name PASSED" or "test_name FAILED"
    # pytest -v format: "tests/test_file.py::test_name PASSED"
    pattern = r'^tests/[^:]+::(\S+)\s+(PASSED|FAILED|ERROR)'

    for line in output.split('\n'):
        match = re.search(pattern, line)
        if match:
            test_name = match.group(1)
            status = match.group(2)
            # Convert ERROR to FAILED for consistency
            if status == "ERROR":
                status = "FAILED"
            tests[test_name] = status

    return tests


def run(repo: str) -> dict:
    """Run pytest for a repository and return results with individual test details."""
    env = os.environ.copy()
    env["REPO"] = repo

    tests = {}
    error = None

    try:
        # Run pytest with verbose output to get individual test results
        result = subprocess.run(
            ["python", "-m", "pytest", "-v", "tests"],
            env=env,
            capture_output=True,
            text=True
        )
        output = result.stdout + result.stderr
        tests = parse_pytest_output(output)

    except Exception as e:
        error = str(e)

    passed = sum(1 for status in tests.values() if status == "PASSED")
    failed = sum(1 for status in tests.values() if status == "FAILED")
    total = len(tests)

    return {
        "tests": tests,
        "metrics": {
            "total": total,
            "passed": passed,
            "failed": failed
        },
        "error": error
    }


# Run evaluation for repository_after only (code generation task)
print(" Evaluating repository_after...")
after = run("repository_after")
print(f"    Passed: {after['metrics']['passed']}")
print(f"    Failed: {after['metrics']['failed']}")

# Generate report
now = datetime.datetime.utcnow()
date_str = now.strftime("%Y-%m-%d")
time_str = now.strftime("%H-%M-%S")
output_dir = os.path.join("evaluation", date_str, time_str)
os.makedirs(output_dir, exist_ok=True)

report = {
    "timestamp": now.isoformat() + "Z",
    "after": after,
    "success": after["metrics"]["failed"] == 0 and after["metrics"]["total"] > 0,
    "error": None
}

report_path = os.path.join(output_dir, "report.json")
with open(report_path, "w") as f:
    json.dump(report, f, indent=2)

print("\n============================================================")
print("EVALUATION SUMMARY")
print("============================================================")
print(f"Total: {after['metrics']['total']} | Passed: {after['metrics']['passed']} | Failed: {after['metrics']['failed']}")
print(f"Success Rate: {(after['metrics']['passed'] / after['metrics']['total'] * 100) if after['metrics']['total'] else 0:.1f}%")
print(f"Overall: {'PASS' if report['success'] else 'FAIL'}")
print("============================================================")
print(f"\nReport saved to: {report_path}")

if not report["success"]:
    exit(1)
