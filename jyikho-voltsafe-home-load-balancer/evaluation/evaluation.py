#!/usr/bin/env python3
"""
Evaluation script for VoltSafe Home Load Balancer.
Runs all tests and generates a comprehensive report.
"""
import subprocess
import json
import os
import sys
import re
from datetime import datetime
from pathlib import Path


def run_command(command: list, cwd: str = None) -> dict:
    """Run a command and capture output."""
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=300
        )
        return {
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "output": result.stdout + result.stderr
        }
    except subprocess.TimeoutExpired:
        return {
            "exit_code": -1,
            "stdout": "",
            "stderr": "Command timed out",
            "output": "Command timed out"
        }
    except Exception as e:
        return {
            "exit_code": -1,
            "stdout": "",
            "stderr": str(e),
            "output": str(e)
        }


def parse_pytest_output(output: str) -> dict:
    """Parse pytest output to extract test results."""
    tests = []
    passed = 0
    failed = 0
    errors = 0
    
    # Parse individual test results
    test_pattern = r'(tests/\S+::\S+)\s+(PASSED|FAILED|ERROR)'
    for match in re.finditer(test_pattern, output):
        name, status = match.groups()
        tests.append({
            "name": name,
            "status": status,
            "duration": "0.00s"
        })
        if status == "PASSED":
            passed += 1
        elif status == "FAILED":
            failed += 1
        else:
            errors += 1
    
    # Parse summary line
    summary_match = re.search(r'(\d+)\s+passed(?:,\s*(\d+)\s+failed)?(?:,\s*(\d+)\s+error)?', output)
    if summary_match:
        passed = int(summary_match.group(1)) if summary_match.group(1) else passed
        failed = int(summary_match.group(2)) if summary_match.group(2) else failed
        errors = int(summary_match.group(3)) if summary_match.group(3) else errors
    
    total = passed + failed + errors
    success = failed == 0 and errors == 0 and passed > 0
    
    return {
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "total": total,
        "success": success,
        "tests": tests,
        "output": output
    }


def analyze_requirements(output: str) -> dict:
    """Analyze which requirements are met based on test output."""
    requirements = {
        "req1_atomic_validation": False,
        "req2_reactive_visualization": False,
        "req3_idempotent_transitions": False,
        "req4_persistence_integrity": False,
        "req5_collision_testing": False,
        "req6_precision_testing": False
    }
    
    # Check each requirement class
    if "TestAtomicCapacityValidation" in output:
        req1_failed = output.count("TestAtomicCapacityValidation") > output.count("TestAtomicCapacityValidation PASSED")
        if "TestAtomicCapacityValidation" in output and "FAILED" not in output.split("TestAtomicCapacityValidation")[1].split("Test")[0]:
            requirements["req1_atomic_validation"] = True
    
    if "TestReactiveLoadVisualization" in output:
        section = output.split("TestReactiveLoadVisualization")
        if len(section) > 1 and "FAILED" not in section[1].split("class Test")[0] if "class Test" in section[1] else section[1]:
            requirements["req2_reactive_visualization"] = True
    
    if "TestIdempotentStateTransitions" in output:
        section = output.split("TestIdempotentStateTransitions")
        if len(section) > 1 and "FAILED" not in section[1].split("class Test")[0] if "class Test" in section[1] else section[1]:
            requirements["req3_idempotent_transitions"] = True
    
    if "TestPersistenceIntegrity" in output:
        section = output.split("TestPersistenceIntegrity")
        if len(section) > 1 and "FAILED" not in section[1].split("class Test")[0] if "class Test" in section[1] else section[1]:
            requirements["req4_persistence_integrity"] = True
    
    if "test_50_concurrent_requests_all_rejected" in output:
        if "test_50_concurrent_requests_all_rejected PASSED" in output:
            requirements["req5_collision_testing"] = True
    
    if "TestPrecisionCalculation" in output:
        section = output.split("TestPrecisionCalculation")
        if len(section) > 1 and "FAILED" not in section[1].split("class Test")[0] if "class Test" in section[1] else section[1]:
            requirements["req6_precision_testing"] = True
    
    # Simpler check: if all tests pass, all requirements are met
    if "passed" in output and "failed" not in output.lower().split("passed")[0][-20:]:
        summary = re.search(r'(\d+)\s+passed(?:,\s*(\d+)\s+failed)?', output)
        if summary and (not summary.group(2) or int(summary.group(2)) == 0):
            for key in requirements:
                requirements[key] = True
    
    return requirements


def generate_report():
    """Generate the evaluation report."""
    print("=" * 70)
    print("🔍 Starting VoltSafe Home Load Balancer Evaluation...")
    print("=" * 70)
    
    project_root = Path(__file__).parent.parent
    timestamp = datetime.utcnow().isoformat() + "Z"
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    time_str = datetime.utcnow().strftime("%H-%M-%S")
    
    # Run tests
    print("\n📋 Running Backend Tests...\n")
    
    test_result = run_command(
        ["python", "-m", "pytest", "tests/", "-v", "--tb=short"],
        cwd=str(project_root)
    )
    
    print(test_result["output"])
    
    # Parse results
    parsed = parse_pytest_output(test_result["output"])
    requirements = analyze_requirements(test_result["output"])
    requirements_met = sum(1 for v in requirements.values() if v)
    total_requirements = len(requirements)
    
    # Build report
    report = {
        "evaluation_metadata": {
            "evaluation_id": f"voltsafe-{int(datetime.utcnow().timestamp())}",
            "timestamp": timestamp,
            "evaluator": "automated_test_suite",
            "project": "voltsafe_home_load_balancer",
            "version": "1.0.0",
            "framework": "pytest",
            "language": "python"
        },
        "environment": {
            "python_version": sys.version,
            "platform": sys.platform
        },
        "tests": {
            "passed": parsed["passed"],
            "failed": parsed["failed"],
            "errors": parsed["errors"],
            "total": parsed["total"],
            "success": parsed["success"],
            "tests": parsed["tests"]
        },
        "requirements_checklist": requirements,
        "final_verdict": {
            "success": parsed["success"],
            "total_tests": parsed["total"],
            "passed_tests": parsed["passed"],
            "failed_tests": parsed["failed"],
            "success_rate": f"{(parsed['passed'] / parsed['total'] * 100):.1f}%" if parsed["total"] > 0 else "0%",
            "meets_requirements": requirements_met == total_requirements,
            "requirements_met": requirements_met,
            "total_requirements": total_requirements
        },
        "output": parsed["output"]
    }
    
    # Save report
    reports_dir = project_root / "evaluation" / "reports" / date_str / time_str
    reports_dir.mkdir(parents=True, exist_ok=True)
    report_path = reports_dir / "report.json"
    
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    # Display summary
    print("\n" + "=" * 70)
    print("📊 EVALUATION SUMMARY")
    print("=" * 70)
    print(f"   Tests: {parsed['passed']}/{parsed['total']} passed")
    print(f"   Requirements: {requirements_met}/{total_requirements} met")
    print(f"   Success Rate: {report['final_verdict']['success_rate']}")
    print("=" * 70)
    
    print("\n📋 Requirements Status:")
    for key, value in requirements.items():
        status = "✅" if value else "❌"
        print(f"   {status} {key}")
    
    print(f"\n📁 Report saved to: {report_path}")
    
    if report["final_verdict"]["success"] and report["final_verdict"]["meets_requirements"]:
        print("\n🎉 EVALUATION PASSED!")
        return 0
    else:
        print("\n❌ EVALUATION FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(generate_report())