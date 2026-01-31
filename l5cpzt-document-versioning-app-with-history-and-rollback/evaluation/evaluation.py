"""
Evaluation script for Document Versioning App

This script runs all requirement tests and provides a summary of results.
It evaluates whether the implementation meets all specified requirements.
"""
import unittest
import sys
import json
import argparse
from pathlib import Path

# Add tests directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "tests"))

from test_requirements import (
    TestProjectStructure,
    TestRequirement1_Authentication,
    TestRequirement2_DocumentCRUD,
    TestRequirement3_AutomaticVersioning,
    TestRequirement4_VersionHistory,
    TestRequirement5_Rollback,
    TestRequirement6_AccessControl,
    TestRequirement7_VueFrontend,
    TestAdditionalRequirements,
    TestRepositoryBefore,
)


def run_evaluation(json_output=None):
    """Run all evaluation tests and return results."""
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    test_classes = [
        TestProjectStructure,
        TestRequirement1_Authentication,
        TestRequirement2_DocumentCRUD,
        TestRequirement3_AutomaticVersioning,
        TestRequirement4_VersionHistory,
        TestRequirement5_Rollback,
        TestRequirement6_AccessControl,
        TestRequirement7_VueFrontend,
        TestAdditionalRequirements,
        TestRepositoryBefore,
    ]
    
    for test_class in test_classes:
        suite.addTests(loader.loadTestsFromTestCase(test_class))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Calculate results
    total = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    passed = total - failures - errors
    
    # Create results data
    results_data = {
        "summary": {
            "total_tests": total,
            "passed": passed,
            "failed": failures,
            "errors": errors,
            "success": failures == 0 and errors == 0
        },
        "requirements": {},
        "details": {
            "failures": [{"test": str(f[0]), "error": f[1]} for f in result.failures],
            "errors": [{"test": str(e[0]), "error": e[1]} for e in result.errors]
        }
    }
    
    # Requirement summary
    requirements = {
        "1. User Authentication (JWT)": TestRequirement1_Authentication,
        "2. Document CRUD": TestRequirement2_DocumentCRUD,
        "3. Automatic Versioning": TestRequirement3_AutomaticVersioning,
        "4. Version History": TestRequirement4_VersionHistory,
        "5. Rollback": TestRequirement5_Rollback,
        "6. Access Control": TestRequirement6_AccessControl,
        "7. Vue 3 Frontend": TestRequirement7_VueFrontend,
    }
    
    for req_name, test_class in requirements.items():
        # Check if any tests from this class failed
        class_failures = [f for f in result.failures if test_class.__name__ in str(f[0])]
        class_errors = [e for e in result.errors if test_class.__name__ in str(e[0])]
        
        passed_req = not (class_failures or class_errors)
        results_data["requirements"][req_name] = {
            "passed": passed_req,
            "status": "PASS" if passed_req else "FAIL"
        }
    
    # Print summary
    print("\n" + "=" * 70)
    print("EVALUATION SUMMARY")
    print("=" * 70)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failures}")
    print(f"Errors: {errors}")
    
    print("\n" + "-" * 70)
    print("REQUIREMENTS STATUS")
    print("-" * 70)
    
    for req_name, req_data in results_data["requirements"].items():
        status = f"[{req_data['status']}]"
        print(f"{status} - {req_name}")
    
    print("\n" + "=" * 70)
    
    if failures == 0 and errors == 0:
        print("[SUCCESS] ALL REQUIREMENTS MET!")
    else:
        print(f"[WARNING] {failures + errors} issues found")
    
    # Save JSON output if requested
    if json_output:
        output_path = Path(json_output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(results_data, f, indent=2)
        print(f"\nResults saved to: {json_output}")
    
    return 0 if (failures == 0 and errors == 0) else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run evaluation tests")
    parser.add_argument("--json-output", help="Path to save JSON results")
    args = parser.parse_args()
    sys.exit(run_evaluation(args.json_output))
