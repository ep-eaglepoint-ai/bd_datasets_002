"""
Evaluation script for Document Versioning App

This script runs all requirement tests and provides a summary of results.
It evaluates whether the implementation meets all specified requirements.
"""
import unittest
import sys
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


def run_evaluation():
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
    
    # Print summary
    print("\n" + "=" * 70)
    print("EVALUATION SUMMARY")
    print("=" * 70)
    
    total = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    passed = total - failures - errors
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failures}")
    print(f"Errors: {errors}")
    
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
    
    print("\n" + "-" * 70)
    print("REQUIREMENTS STATUS")
    print("-" * 70)
    
    for req_name, test_class in requirements.items():
        # Check if any tests from this class failed
        class_failures = [f for f in result.failures if test_class.__name__ in str(f[0])]
        class_errors = [e for e in result.errors if test_class.__name__ in str(e[0])]
        
        if class_failures or class_errors:
            status = "[FAIL]"
        else:
            status = "[PASS]"
        
        print(f"{status} - {req_name}")
    
    print("\n" + "=" * 70)
    
    if failures == 0 and errors == 0:
        print("[SUCCESS] ALL REQUIREMENTS MET!")
        return 0
    else:
        print(f"[WARNING] {failures + errors} issues found")
        return 1


if __name__ == "__main__":
    sys.exit(run_evaluation())
