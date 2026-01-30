"""
Evaluation script that runs all tests and generates reports.
"""

import os
import sys
import json
import subprocess
import time
from datetime import datetime
from pathlib import Path


def run_command(cmd, cwd=None):
    """Run a command and return (success, output, error)."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            cwd=cwd,
            timeout=300  # 5 minute timeout
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out after 300 seconds"
    except Exception as e:
        return False, "", str(e)


def ensure_reports_dir():
    """Ensure reports directory exists."""
    reports_dir = Path(__file__).parent / "reports"
    reports_dir.mkdir(exist_ok=True)
    return reports_dir


def generate_report():
    """Generate evaluation report."""
    reports_dir = ensure_reports_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_dir = reports_dir / timestamp
    report_dir.mkdir(exist_ok=True)
    
    report = {
        "timestamp": timestamp,
        "datetime": datetime.now().isoformat(),
        "tests": {},
        "summary": {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "errors": 0
        }
    }
    
    # Run after-test (expected to pass)
    print("Running after-test (expected to pass)...")
    success, stdout, stderr = run_command("pytest -q tests/after-test.py -v")
    report["tests"]["after-test"] = {
        "success": success,
        "stdout": stdout,
        "stderr": stderr,
        "expected_to_pass": True
    }
    if success:
        report["summary"]["passed"] += 1
    else:
        report["summary"]["failed"] += 1
    report["summary"]["total_tests"] += 1
    
    # Run meta-test (expected to pass)
    print("Running meta-test (expected to pass)...")
    success, stdout, stderr = run_command("pytest -q tests/meta-test.py -v")
    report["tests"]["meta-test"] = {
        "success": success,
        "stdout": stdout,
        "stderr": stderr,
        "expected_to_pass": True
    }
    if success:
        report["summary"]["passed"] += 1
    else:
        report["summary"]["failed"] += 1
    report["summary"]["total_tests"] += 1
    
    # Check repository structure
    print("Validating repository structure...")
    structure_checks = {}
    
    required_dirs = [
        "repository_before",
        "repository_after",
        "tests",
        "evaluation",
        "tests/resource"
    ]
    
    for dir_name in required_dirs:
        dir_path = Path(__file__).parent.parent / dir_name
        structure_checks[dir_name] = dir_path.exists() and dir_path.is_dir()
    
    required_files = [
        "repository_after/__init__.py",
        "repository_after/config.py",
        "repository_after/detector.py",
        "repository_after/entropy.py",
        "repository_after/patterns.py",
        "repository_after/file_reader.py",
        "repository_after/formatter.py",
        "repository_after/main.py",
        "tests/after-test.py",
        "tests/meta-test.py",
        "tests/resource/broken-code.py",
        "tests/resource/working-code.py"
    ]
    
    for file_name in required_files:
        file_path = Path(__file__).parent.parent / file_name
        structure_checks[file_name] = file_path.exists() and file_path.is_file()
    
    report["structure"] = structure_checks
    
    # Check implementation requirements
    print("Checking implementation requirements...")
    impl_checks = {}
    
    # Read all Python files in repository_after to check implementation
    repo_after_dir = Path(__file__).parent.parent / "repository_after"
    if repo_after_dir.exists():
        all_content = ""
        for py_file in repo_after_dir.glob("*.py"):
            try:
                with open(py_file, 'r') as f:
                    all_content += f.read() + "\n"
            except:
                pass
        
        if all_content:
            impl_checks["uses_chunks"] = "read(" in all_content and "CHUNK_SIZE" in all_content
            impl_checks["calculates_entropy"] = "calculate_entropy" in all_content or "entropy" in all_content.lower()
            impl_checks["detects_nop"] = "nop" in all_content.lower() or "0x90" in all_content
            impl_checks["detects_xor"] = "xor" in all_content.lower() or "0x31" in all_content
            impl_checks["uses_struct"] = "import struct" in all_content or "from struct" in all_content
            impl_checks["no_yara"] = "yara" not in all_content.lower()
            impl_checks["no_volatility"] = "volatility" not in all_content.lower()
            impl_checks["no_pefile"] = "pefile" not in all_content.lower()
            impl_checks["outputs_hex_offset"] = "0x" in all_content and "offset" in all_content.lower()
            impl_checks["confidence_score"] = "confidence" in all_content.lower()
        else:
            impl_checks["file_exists"] = False
    else:
        impl_checks["file_exists"] = False
    
    report["implementation_checks"] = impl_checks
    
    # Save report
    report_file = report_dir / "report.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nEvaluation complete. Report saved to: {report_file}")
    print(f"Summary: {report['summary']['passed']}/{report['summary']['total_tests']} test suites passed")
    
    return report


def main():
    """Main entry point."""
    print("Starting evaluation...")
    report = generate_report()
    
    # Print summary
    print("\n" + "="*60)
    print("EVALUATION SUMMARY")
    print("="*60)
    print(f"Total test suites: {report['summary']['total_tests']}")
    print(f"Passed: {report['summary']['passed']}")
    print(f"Failed: {report['summary']['failed']}")
    print("\nTest Results:")
    for test_name, test_result in report['tests'].items():
        status = "✓ PASS" if test_result['success'] else "✗ FAIL"
        expected = " (expected)" if (test_result.get('expected_to_fail', False) and not test_result['success']) or \
                                   (test_result.get('expected_to_pass', False) and test_result['success']) else ""
        print(f"  {test_name}: {status}{expected}")
    
    print("\nImplementation Checks:")
    for check_name, check_result in report.get('implementation_checks', {}).items():
        status = "✓" if check_result else "✗"
        print(f"  {check_name}: {status}")
    
    print("="*60)
    
    # Exit with appropriate code
    if report['summary']['failed'] > 0 and not all(
        not t['success'] and t.get('expected_to_fail', False) 
        for t in report['tests'].values() 
        if not t['success']
    ):
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
