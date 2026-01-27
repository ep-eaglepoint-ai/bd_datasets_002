import subprocess
import os
import sys

def verify_implementation():
    print("Starting verification of refactored tests...")
    
    test_file = r"repository_after/test_csv_to_json.py"
    if not os.path.exists(test_file):
        print(f"Error: {test_file} not found.")
        sys.exit(1)

    print(f"Running {test_file}...")
    try:
        # Run the test and capture output
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print(result.stdout)
        print(result.stderr)

        if result.returncode == 0:
            print("SUCCESS: The refactored tests passed.")
        else:
            print(f"FAILURE: The tests failed with exit code {result.returncode}.")
            sys.exit(1)

        # Check for non-standard library dependencies in the code (meta-check)
        with open(test_file, 'r') as f:
            content = f.read()
            
        forbidden = ['parameterized', 'pep8', 'filecmp']
        for lib in forbidden:
            if f"import {lib}" in content or f"from {lib}" in content:
                print(f"WARNING: Found forbidden external dependency '{lib}' in {test_file}.")
                sys.exit(1)
        
        print("SUCCESS: No forbidden external dependencies found.")
        print("Implementation confirmed correctly.")

    except subprocess.TimeoutExpired:
        print("FAILURE: The tests timed out (possible hang or live request wait).")
        sys.exit(1)
    except Exception as e:
        print(f"FAILURE: An error occurred during verification: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_implementation()
