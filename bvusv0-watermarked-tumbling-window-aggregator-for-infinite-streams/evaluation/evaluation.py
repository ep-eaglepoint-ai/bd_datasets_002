import sys
import os
import json
import argparse
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from tests import test_functional, test_structure, test_score


def run_tests():
    """Run all tests and collect results."""        
    results = {
        'functional': [],
        'structure': [],
        'score': []
    }
    
    test_modules = [
        ('functional', test_functional),
        ('structure', test_structure),
        ('score', test_score),
    ]
    
    for category, module in test_modules:
        test_functions = [getattr(module, name) for name in dir(module) 
                         if name.startswith('test_') and callable(getattr(module, name))]
        
        for test_func in test_functions:
            try:
                test_func()
                results[category].append({
                    'name': test_func.__name__,
                    'status': 'PASS'
                })
            except Exception as e:
                results[category].append({
                    'name': test_func.__name__,
                    'status': 'FAIL',
                    'error': str(e)
                })
    
    return results


def main():
    """Run evaluation and generate report."""       
    parser = argparse.ArgumentParser(description='Run evaluation tests')
    parser.add_argument('--output', help='Output file path for report')
    args = parser.parse_args()
    
    print("Running evaluation tests...")
    results = run_tests()
    
    # Calculate statistics
    total_tests = sum(len(results[cat]) for cat in results)
    passed_tests = sum(1 for cat in results for test in results[cat] if test['status'] == 'PASS')
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_tests': total_tests,
        'passed': passed_tests,
        'failed': total_tests - passed_tests,
        'success_rate': f"{(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%",
        'results': results
    }
    
    # Determine output path
    if args.output:
        output_path = args.output
        parent = os.path.dirname(output_path)
        if parent:
            try:
                os.makedirs(parent, exist_ok=True)
            except Exception as e:
                print(f"Failed to create output directory {parent}: {e}")
                return 1
    else:
        timestamp = datetime.now().strftime('%Y-%m-%d/%H-%M-%S')
        output_dir = os.path.join(os.path.dirname(__file__), 'report', timestamp)
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, 'report.json')

    # Write report
    try:
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
    except Exception as e:
        print(f"Failed to write report to {output_path}: {e}")
        return 1
    
    # Print summary
    print(f"\nEvaluation Results:")
    print(f"  Total Tests: {total_tests}")
    print(f"  Passed: {passed_tests}")
    print(f"  Failed: {total_tests - passed_tests}")
    print(f"  Success Rate: {report['success_rate']}")
    print(f"\nReport saved to: {output_path}")
    
    return 0 if passed_tests == total_tests else 1


if __name__ == "__main__":
    sys.exit(main())

