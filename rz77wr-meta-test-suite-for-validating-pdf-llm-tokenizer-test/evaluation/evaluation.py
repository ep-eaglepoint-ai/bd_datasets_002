#!/usr/bin/env python3
"""
Evaluation runner for PDF LLM Tokenizer test suite.
Runs primary tests and meta-tests, collects results, and generates reports.
"""
import json
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any


def run_pytest(test_path: str, description: str) -> Dict[str, Any]:
    """Run pytest on a specific path and return structured results."""
    print(f"\n{'='*60}")
    print(f"RUNNING {description.upper()}")
    print(f"{'='*60}")
    print(f"Test location: {test_path}\n")
    
    result = subprocess.run(
        [sys.executable, "-m", "pytest", test_path, "-v", "--tb=short"],
        capture_output=True,
        text=True,
        cwd=Path(__file__).parent.parent
    )
    
    # Parse output for test results
    output_lines = result.stdout.split("\n")
    test_results = []
    passed = 0
    failed = 0
    errors = 0
    skipped = 0
    
    for line in output_lines:
        if " PASSED" in line:
            test_name = line.split("::")[1].split(" ")[0] if "::" in line else line
            test_results.append({"name": test_name.strip(), "status": "passed"})
            passed += 1
        elif " FAILED" in line:
            test_name = line.split("::")[1].split(" ")[0] if "::" in line else line
            test_results.append({"name": test_name.strip(), "status": "failed"})
            failed += 1
        elif " ERROR" in line:
            test_name = line.split("::")[1].split(" ")[0] if "::" in line else line
            test_results.append({"name": test_name.strip(), "status": "error"})
            errors += 1
        elif " SKIPPED" in line:
            test_name = line.split("::")[1].split(" ")[0] if "::" in line else line
            test_results.append({"name": test_name.strip(), "status": "skipped"})
            skipped += 1
    
    total = passed + failed + errors + skipped
    
    print(f"Results: {passed} passed, {failed} failed, {errors} errors, {skipped} skipped (total: {total})")
    
    for test in test_results:
        status_symbol = "✓" if test["status"] == "passed" else "✗"
        status_text = "PASS" if test["status"] == "passed" else test["status"].upper()
        print(f"  [{status_symbol} {status_text}] {test['name']}")
    
    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "skipped": skipped,
        "tests": test_results,
        "exit_code": result.returncode
    }


def main():
    run_id = str(uuid.uuid4())
    start_time = datetime.utcnow()
    
    print(f"Run ID: {run_id}")
    print(f"Started at: {start_time.isoformat()}Z")
    
    print("\n" + "="*60)
    print("META-TEST SUITE FOR VALIDATING PDF LLM TOKENIZER TEST")
    print("="*60)
    
    # Run primary tests
    primary_results = run_pytest(
        "repository_after/test_pdf_llm_tokenizer.py",
        "PRIMARY TESTS"
    )
    
    # Run meta-tests
    meta_results = run_pytest(
        "tests/",
        "META-TESTS"
    )
    
    # Evaluation summary
    print("\n" + "="*60)
    print("EVALUATION SUMMARY")
    print("="*60)
    print()
    
    primary_status = "PASSED" if primary_results["failed"] == 0 and primary_results["errors"] == 0 else "FAILED"
    meta_status = "PASSED" if meta_results["failed"] == 0 and meta_results["errors"] == 0 else "FAILED"
    
    print("Primary Tests:")
    print(f"  Overall: {primary_status}")
    print(f"  Tests: {primary_results['passed']}/{primary_results['total']} passed")
    print()
    print("Meta-Tests:")
    print(f"  Overall: {meta_status}")
    print(f"  Tests: {meta_results['passed']}/{meta_results['total']} passed")
    
    # Expected behavior check
    print("\n" + "="*60)
    print("EXPECTED BEHAVIOR CHECK")
    print("="*60)
    
    primary_ok = primary_status == "PASSED"
    meta_ok = meta_status == "PASSED"
    
    print(f"[{'✓' if primary_ok else '✗'} {'OK' if primary_ok else 'FAIL'}] Primary tests passed")
    print(f"[{'✓' if meta_ok else '✗'} {'OK' if meta_ok else 'FAIL'}] Meta-tests passed")
    
    # Save report
    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()
    
    report_dir = Path(__file__).parent / "reports" / start_time.strftime("%Y-%m-%d") / start_time.strftime("%H-%M-%S")
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "report.json"
    
    report = {
        "run_id": run_id,
        "task_title": "Meta-Test Suite for Validating PDF LLM Tokenizer Test",
        "start_time": start_time.isoformat() + "Z",
        "end_time": end_time.isoformat() + "Z",
        "duration_seconds": duration,
        "primary_test_results": primary_results,
        "meta_test_results": meta_results,
        "overall_status": "SUCCESS" if primary_ok and meta_ok else "FAILURE",
        "execution_environment": {
            "python_version": sys.version,
            "platform": sys.platform
        }
    }
    
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\nReport saved to:")
    print(f"evaluation/reports/{start_time.strftime('%Y-%m-%d')}/{start_time.strftime('%H-%M-%S')}/report.json")
    
    print("\n" + "="*60)
    print("EVALUATION COMPLETE")
    print("="*60)
    print(f"Run ID: {run_id}")
    print(f"Duration: {duration:.2f}s")
    print(f"Success: {'YES' if primary_ok and meta_ok else 'NO'}")
    
    # Exit with appropriate code
    sys.exit(0 if primary_ok and meta_ok else 1)


if __name__ == "__main__":
    main()
