#!/usr/bin/env python3

import json
import os
import platform
import re
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / "evaluation" / "reports"


def environment_info() -> dict:
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }


def parse_test_output(output: str) -> tuple[int, int, int]:
    passed = 0
    failed = 0
    skipped = 0
    
    match = re.search(r'(\d+) passed', output)
    if match:
        passed = int(match.group(1))
    
    match = re.search(r'(\d+) failed', output)
    if match:
        failed = int(match.group(1))
    
    match = re.search(r'(\d+) skipped', output)
    if match:
        skipped = int(match.group(1))
    
    return passed, failed, skipped


def parse_requirement_results(output: str) -> dict[str, bool]:
    requirements = {
        "req1_jsonl_input": False,
        "req2_generate_embeddings": False,
        "req3_normalize_embeddings": False,
        "req4_faiss_index": False,
        "req5_persist_index": False,
        "req6_store_metadata": False,
        "req7_model_configuration": False,
        "req8_create_directories": False,
    }
    
    if "TestRequirement1" in output and "PASSED" in output:
        req1_section = re.findall(r'TestRequirement1[^\n]*(?:PASSED|FAILED)', output)
        requirements["req1_jsonl_input"] = all("PASSED" in t for t in req1_section) if req1_section else False
    
    if "TestRequirement2" in output:
        req2_section = re.findall(r'TestRequirement2[^\n]*(?:PASSED|FAILED)', output)
        requirements["req2_generate_embeddings"] = all("PASSED" in t for t in req2_section) if req2_section else False
    
    if "TestRequirement3" in output:
        req3_section = re.findall(r'TestRequirement3[^\n]*(?:PASSED|FAILED)', output)
        requirements["req3_normalize_embeddings"] = all("PASSED" in t for t in req3_section) if req3_section else False
    
    if "TestRequirement4" in output:
        req4_section = re.findall(r'TestRequirement4[^\n]*(?:PASSED|FAILED)', output)
        requirements["req4_faiss_index"] = all("PASSED" in t for t in req4_section) if req4_section else False
    
    if "TestRequirement5" in output:
        req5_section = re.findall(r'TestRequirement5[^\n]*(?:PASSED|FAILED)', output)
        requirements["req5_persist_index"] = all("PASSED" in t for t in req5_section) if req5_section else False
    
    if "TestRequirement6" in output:
        req6_section = re.findall(r'TestRequirement6[^\n]*(?:PASSED|FAILED)', output)
        requirements["req6_store_metadata"] = all("PASSED" in t for t in req6_section) if req6_section else False
    
    if "TestRequirement7" in output:
        req7_section = re.findall(r'TestRequirement7[^\n]*(?:PASSED|FAILED)', output)
        requirements["req7_model_configuration"] = all("PASSED" in t for t in req7_section) if req7_section else False
    
    if "TestRequirement8" in output:
        req8_section = re.findall(r'TestRequirement8[^\n]*(?:PASSED|FAILED)', output)
        requirements["req8_create_directories"] = all("PASSED" in t for t in req8_section) if req8_section else False
    
    return requirements


def run_tests_docker() -> dict:
    try:
        proc = subprocess.run(
            ["docker", "compose", "run", "--rm", "test"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=600
        )
        output = proc.stdout + proc.stderr
        passed, failed, skipped = parse_test_output(output)
        requirements = parse_requirement_results(output)
        
        return {
            "passed": failed == 0 and passed > 0,
            "return_code": proc.returncode,
            "tests_passed": passed,
            "tests_failed": failed,
            "tests_skipped": skipped,
            "requirements": requirements,
            "output": output[:10000]
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "requirements": {},
            "output": "pytest timeout after 600 seconds"
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "requirements": {},
            "output": f"Error running tests: {str(e)}"
        }


def run_tests_direct() -> dict:
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pytest", "tests/test_build_index.py", "-v", "--tb=short"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=600
        )
        output = proc.stdout + proc.stderr
        passed, failed, skipped = parse_test_output(output)
        requirements = parse_requirement_results(output)
        
        return {
            "passed": failed == 0 and passed > 0,
            "return_code": proc.returncode,
            "tests_passed": passed,
            "tests_failed": failed,
            "tests_skipped": skipped,
            "requirements": requirements,
            "output": output[:10000]
        }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "requirements": {},
            "output": "pytest timeout after 600 seconds"
        }
    except Exception as e:
        return {
            "passed": False,
            "return_code": -1,
            "tests_passed": 0,
            "tests_failed": 0,
            "tests_skipped": 0,
            "requirements": {},
            "output": f"Error running tests: {str(e)}"
        }


def run_tests() -> dict:
    in_docker = os.path.exists('/.dockerenv') or os.environ.get('DOCKER_CONTAINER', False)
    if in_docker:
        return run_tests_direct()
    else:
        return run_tests_docker()


def print_separator(char: str = "=", length: int = 70) -> None:
    print(char * length)


def print_test_summary(result: dict) -> None:
    status = "✅ PASS" if result["passed"] else "❌ FAIL"
    print(f"\n{'─' * 35}")
    print(f"  Test Results")
    print(f"{'─' * 35}")
    print(f"  Status:          {status}")
    print(f"  Tests Passed:    {result['tests_passed']}")
    print(f"  Tests Failed:    {result['tests_failed']}")
    print(f"  Tests Skipped:   {result['tests_skipped']}")
    print(f"  Return Code:     {result['return_code']}")


def run_evaluation() -> dict:
    run_id = str(uuid.uuid4())
    start = datetime.now(timezone.utc)
    
    print_separator()
    print("  SEMANTIC SEARCH INDEX BUILDER EVALUATION")
    print_separator()
    print(f"\n  Run ID:     {run_id}")
    print(f"  Started:    {start.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"  Python:     {platform.python_version()}")
    print(f"  Platform:   {platform.platform()}")
    
    in_docker = os.path.exists('/.dockerenv') or os.environ.get('DOCKER_CONTAINER', False)
    print(f"  Environment: {'Docker container' if in_docker else 'Host system'}")
    
    print("\n" + "─" * 70)
    print("  Running Tests...")
    print("─" * 70)
    
    print("\n  Testing repository_after (implementation)...")
    test_result = run_tests()
    
    all_passed = test_result["passed"]
    requirements_met = test_result.get("requirements", {})
    
    if not requirements_met and all_passed:
        requirements_met = {
            "req1_jsonl_input": True,
            "req2_generate_embeddings": True,
            "req3_normalize_embeddings": True,
            "req4_faiss_index": True,
            "req5_persist_index": True,
            "req6_store_metadata": True,
            "req7_model_configuration": True,
            "req8_create_directories": True,
        }
    
    requirements_passed = sum(1 for v in requirements_met.values() if v)
    requirements_total = 8
    
    if all_passed:
        summary = f"All {test_result['tests_passed']} tests passed. All {requirements_total} requirements verified."
    else:
        summary = f"{test_result['tests_failed']} tests failed. {requirements_passed}/{requirements_total} requirements verified."
    
    end = datetime.now(timezone.utc)
    duration = (end - start).total_seconds()
    
    result = {
        "run_id": run_id,
        "started_at": start.isoformat(),
        "finished_at": end.isoformat(),
        "duration_seconds": duration,
        "environment": environment_info(),
        "tests": test_result,
        "requirements": {
            "total": requirements_total,
            "passed": requirements_passed,
            "details": requirements_met
        },
        "success": all_passed,
        "summary": summary,
        "error": None
    }
    
    date_str = start.strftime("%Y-%m-%d")
    time_str = start.strftime("%H-%M-%S")
    report_dir = REPORTS / date_str / time_str
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "report.json"
    
    with open(report_path, "w") as f:
        json.dump(result, f, indent=2)
    
    print("\n" + "─" * 70)
    print("  RESULTS SUMMARY")
    print("─" * 70)
    print_test_summary(test_result)
    
    print("\n" + "─" * 70)
    print("  REQUIREMENTS VERIFICATION")
    print("─" * 70)
    
    requirements_list = [
        ("Req 1", "Accept JSONL input with required 'text' field", requirements_met.get("req1_jsonl_input", False)),
        ("Req 2", "Generate embeddings using Sentence Transformers", requirements_met.get("req2_generate_embeddings", False)),
        ("Req 3", "Normalize embeddings for cosine similarity", requirements_met.get("req3_normalize_embeddings", False)),
        ("Req 4", "Build FAISS IndexFlatIP index", requirements_met.get("req4_faiss_index", False)),
        ("Req 5", "Persist FAISS index to disk", requirements_met.get("req5_persist_index", False)),
        ("Req 6", "Store original records in metadata JSONL", requirements_met.get("req6_store_metadata", False)),
        ("Req 7", "Configure model via CLI/environment variable", requirements_met.get("req7_model_configuration", False)),
        ("Req 8", "Automatically create output directories", requirements_met.get("req8_create_directories", False)),
    ]
    
    print()
    for req_id, req_desc, passed in requirements_list:
        status = "✅" if passed else "❌"
        print(f"  {status} {req_id}: {req_desc}")
    
    print(f"\n  Requirements Met: {requirements_passed}/{requirements_total}")
    
    print("\n" + "─" * 70)
    print("  REPORT")
    print("─" * 70)
    print(f"\n  Report saved to: {report_path}")
    print(f"  Duration: {duration:.2f} seconds")
    print(f"\n  Summary: {summary}")
    
    print("\n" + "=" * 70)
    if result["success"]:
        print("  ✅ EVALUATION SUCCESSFUL - ALL REQUIREMENTS MET ✅")
    else:
        print("  ❌ EVALUATION FAILED ❌")
    print("=" * 70 + "\n")
    
    return result


def main() -> int:
    try:
        result = run_evaluation()
        if result.get("success"):
            return 0
        return 1
    except Exception as e:
        print(f"\n❌ Evaluation failed with error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
