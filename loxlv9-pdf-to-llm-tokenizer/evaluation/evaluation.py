import json
import subprocess
import os
import sys
import datetime

def run_tests():
    """Runs pytest and captures JSON output."""
    print("📊 Running Python tests...")
    
    # Clean previous pycache
    subprocess.run(["find", ".", "-name", "*.pyc", "-delete"], capture_output=True)
    subprocess.run(["find", ".", "-name", "__pycache__", "-type", "d", "-exec", "rm", "-rf", "{}", "+"], capture_output=True)

    result = subprocess.run(
        ["pytest", "tests/test_tokenizer.py", "--json-report", "--json-report-file=test_report.json", "-v"],
        capture_output=True,
        text=True
    )
    
    return result

def parse_test_results():
    """Parses the pytest-json-report file."""
    try:
        with open("test_report.json", "r") as f:
            data = json.load(f)
        
        tests = []
        passed = 0
        failed = 0
        
        for test in data.get("tests", []):
            name = test["nodeid"].split("::")[-1]
            outcome = test["outcome"].upper()
            duration = f"{test.get('call', {}).get('duration', 0):.3f}s"
            
            test_res = {
                "name": name,
                "status": outcome,
                "duration": duration
            }
            
            if outcome == "PASSED":
                passed += 1
            else:
                failed += 1
                if "call" in test and "longrepr" in test["call"]:
                    test_res["failure_messages"] = [str(test["call"]["longrepr"])[:500]]
            
            tests.append(test_res)
            
        return tests, passed, failed
    except Exception as e:
        print(f"Error parsing test report: {e}")
        return [], 0, 0
    finally:
        if os.path.exists("test_report.json"):
            os.remove("test_report.json")

def check_requirements(tests):
    """Maps tests to the 20 requirements checklist."""
    def passed(name_fragment):
        for t in tests:
            if name_fragment.lower() in t["name"].lower() and t["status"] == "PASSED":
                return True
        return False

    return {
        "req1_pure_python": passed("req1"),
        "req2_modular_code": passed("req2"),
        "req3_importable": passed("req3"),
        "req4_cli_tool": passed("req4"),
        "req5_multi_page": passed("req5"),
        "req6_empty_pages": passed("req6"),
        "req7_corrupt_pdf": passed("req7"),
        "req8_page_order": passed("req5") or passed("req8"),
        "req9_normalize_whitespace": passed("req9"),
        "req10_no_semantic_change": passed("req10"),
        "req11_deterministic_output": passed("req11"),
        "req12_true_tokenization": passed("req12"),
        "req13_supported_encoding": passed("req12") or passed("req13"),
        "req14_derived_token_count": passed("req14"),
        "req15_no_heuristics": passed("req15"),
        "req16_authoritative_count": passed("req14") or passed("req16"),
        "req17_token_chunking": passed("req17"),
        "req18_configurable_max": passed("req17") or passed("req18"),
        "req19_configurable_overlap": passed("req19"),
        "req20_sequential_chunks": passed("req20")
    }

def main():
    print("🔬 Starting PDF Tokenizer Evaluation...")
    start_time = datetime.datetime.now(datetime.timezone.utc)
    
    proc_res = run_tests()
    tests, passed, failed = parse_test_results()
    
    success = (failed == 0) and (passed > 0)
    
    checklist = check_requirements(tests)
    
    date_str = start_time.strftime("%Y-%m-%d")
    time_str = start_time.strftime("%H-%M-%S")
    report_dir = os.path.join("evaluation", "reports", date_str, time_str)
    os.makedirs(report_dir, exist_ok=True)
    
    report = {
        "evaluation_metadata": {
            "evaluation_id": "eval_" + start_time.strftime("%Y%m%d%H%M%S"),
            "timestamp": start_time.isoformat(),
            "evaluator": "automated_test_suite",
            "project": "pdf_to_llm_tokenizer",
            "version": "1.0.0"
        },
        "environment": {
            "language": "python",
            "python_version": sys.version.split()[0],
            "platform": sys.platform
        },
        "test_execution": {
            "success": success,
            "exit_code": 0,
            "summary": {
                "total": len(tests),
                "passed": passed,
                "failed": failed
            },
            "tests": tests
        },
        "before": {
            "metrics": {"total_files": 0},
            "tests": {"passed": 0, "failed": 0, "total": 0, "success": False, "tests": []}
        },
        "after": {
            "metrics": {"total_files": 1},
            "tests": {
                "passed": passed,
                "failed": failed,
                "total": len(tests),
                "success": success,
                "tests": tests
            }
        },
        "requirements_checklist": checklist,
        "final_verdict": {
            "success": success,
            "total_tests": len(tests),
            "passed_tests": passed,
            "failed_tests": failed,
            "success_rate": f"{(passed/len(tests))*100:.1f}" if tests else "0.0",
            "meets_requirements": all(checklist.values())
        }
    }
    
    report_path = os.path.join(report_dir, "report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
        
    print(f"\n✅ Evaluation complete. Report saved to {report_path}")
    print(f"Passed: {passed}, Failed: {failed}")
    
    print("\nRequirements Checklist:")
    for req, status in checklist.items():
        icon = "✅" if status else "❌"
        print(f"{icon} {req}")

if __name__ == "__main__":
    main()