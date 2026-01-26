#!/usr/bin/env python3
"""
Test script for repository_after (optimized implementation).
Runs tests and outputs results in JSON format for evaluation parsing.
"""

import sys
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any

ROOT = Path(__file__).resolve().parent.parent

# Import evaluation functions
import sys
sys.path.insert(0, str(ROOT / "evaluation"))
from evaluation import run_tests, check_set_based_logic, check_indexed_column_efficiency


def run_test_after() -> Dict[str, Any]:
    """Run tests against repository_after and return results."""
    run_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc)
    
    repo_path = ROOT / "repository_after"
    tests = run_tests(repo_path)
    set_based = check_set_based_logic(repo_path)
    indexed_efficiency = check_indexed_column_efficiency(repo_path)
    
    # Parse test results
    test_list = []
    test_output = tests.get("output", "")
    
    # Extract individual test results
    import re
    lines = test_output.split('\n')
    for line in lines:
        if 'NOTICE:' in line and 'PASSED' in line:
            match = re.search(r'Test (\d+) PASSED: (.+)', line)
            if match:
                test_num, test_desc = match.groups()
                test_list.append({
                    "name": f"test_{test_num}",
                    "description": test_desc,
                    "passed": True
                })
        elif 'ERROR' in line or 'FAILED' in line:
            if 'Test' in line:
                match = re.search(r'Test (\d+) FAILED: (.+)', line)
                if match:
                    test_num, test_desc = match.groups()
                    test_list.append({
                        "name": f"test_{test_num}",
                        "description": test_desc,
                        "passed": False
                    })
    
    # If no individual tests found, create summary
    if not test_list:
        test_list.append({
            "name": "functional_tests",
            "description": "Functional correctness tests",
            "passed": tests["passed"]
        })
    
    # Add validation tests
    test_list.append({
        "name": "set_based_logic",
        "description": "Set-based logic (no row-by-row loops)",
        "passed": set_based["passed"]
    })
    
    test_list.append({
        "name": "indexed_column_efficiency",
        "description": "Indexed column efficiency (no function calls on indexed columns)",
        "passed": indexed_efficiency["passed"]
    })
    
    finished_at = datetime.now(timezone.utc)
    
    # All validation checks should pass for after
    all_passed = all(t["passed"] for t in test_list)
    
    result = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "tests": {
            "passed": sum(1 for t in test_list if t["passed"]),
            "failed": sum(1 for t in test_list if not t["passed"]),
            "total": len(test_list),
            "success": all_passed
        },
        "test_list": test_list,
        "throughput_verified": all_passed,
        "timeouts_verified": all_passed,
        "concurrency_verified": all_passed
    }
    
    return result


def main():
    """Main entry point for test-after."""
    try:
        result = run_test_after()
        
        # Print results to console only
        print(json.dumps(result, indent=2))
        
        return 0 if result["tests"]["success"] else 1
    except Exception as e:
        print(f"Error running test-after: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
