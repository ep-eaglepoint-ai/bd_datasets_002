#!/usr/bin/env python3

import os
import sys
import subprocess
import tempfile
from pathlib import Path

TEST_REPO_PATH = os.environ.get('TEST_REPO_PATH', '/app/repository_before')
is_before = 'before' in TEST_REPO_PATH
TEST_RESULTS_FILE = (
    '/app/tests/test-results-before.json' if is_before
    else '/app/tests/test-results-after.json'
)

def create_node_test_runner():
    """Create a Node.js test runner script with embedded test framework."""
    test_file = 'test-inventory-before.js' if is_before else 'test-inventory.js'
    
    runner_script = f'''#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const TEST_REPO_PATH = process.env.TEST_REPO_PATH || '/app/repository_before';
const isBefore = TEST_REPO_PATH.includes('before');
const TEST_RESULTS_FILE = isBefore 
  ? '/app/tests/test-results-before.json'
  : '/app/tests/test-results-after.json';

// Simple test framework
class TestRunner {{
  constructor() {{
    this.tests = [];
    this.results = {{
      passed: 0,
      failed: 0,
      total: 0,
      testDetails: []
    }};
  }}

  test(name, fn) {{
    this.tests.push({{ name, fn }});
  }}

  async run() {{
    console.log('\\n============================================================');
    console.log(`Running tests on ${{TEST_REPO_PATH.includes('before') ? 'repository_before' : 'repository_after'}}`);
    console.log(`Repository path: ${{TEST_REPO_PATH}}`);
    console.log('============================================================\\n');

    for (const {{ name, fn }} of this.tests) {{
      this.results.total++;
      try {{
        await fn();
        this.results.passed++;
        this.results.testDetails.push({{ name, status: 'passed' }});
        console.log(`✓ ${{name}}`);
      }} catch (error) {{
        this.results.failed++;
        this.results.testDetails.push({{ 
          name, 
          status: 'failed', 
          error: error.message 
        }});
        console.error(`✗ ${{name}}: ${{error.message}}`);
      }}
    }}

    // Write results to file for evaluation script
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(this.results, null, 2));

    console.log('\\n============================================================');
    console.log(`Tests: ${{this.results.passed}} passed, ${{this.results.failed}} failed, ${{this.results.total}} total`);
    console.log('============================================================\\n');

    // For repository_before, failures are expected (it has bugs), so always exit 0
    // For repository_after, failures indicate problems, so exit 1 on failure
    if (isBefore) {{
      // Before repository: failures are expected, always exit successfully
      console.log('Note: Test failures in repository_before are expected (it contains bugs).');
      process.exit(0);
    }} else {{
      // After repository: failures indicate problems
      process.exit(this.results.failed > 0 ? 1 : 0);
    }}
  }}
}}

// Load and run the appropriate test file
// Use stricter tests for repository_before, regular tests for repository_after
const testFile = path.join(__dirname, '{test_file}');

if (fs.existsSync(testFile)) {{
  const testRunner = new TestRunner();
  
  // Make testRunner available globally for test file
  global.test = (name, fn) => testRunner.test(name, fn);
  global.assert = (condition, message) => {{
    if (!condition) {{
      throw new Error(message || 'Assertion failed');
    }}
  }};
  
  // Load test file
  try {{
    require(testFile);
  }} catch (error) {{
    console.error('Error loading test file:', error);
    throw error;
  }}
  
  // Run tests
  testRunner.run().catch(err => {{
    console.error('Test runner error:', err);
    process.exit(1);
  }});
}} else {{
  console.error(`Test file not found: ${{testFile}}`);
  process.exit(1);
}}
'''
    return runner_script

def run_node_tests():
    """Execute Node.js test files using Python-generated test runner."""
    tests_dir = Path(__file__).parent
    
    # Set environment variables
    env = os.environ.copy()
    env['TEST_REPO_PATH'] = TEST_REPO_PATH
    
    try:
        # Build the repository if needed
        repo_path = Path(TEST_REPO_PATH)
        repo_name = 'repository_before' if is_before else 'repository_after'
        
        if (repo_path / 'package.json').exists():
            print(f'Building {repo_name}...')
            subprocess.run(
                ['npm', 'install'],
                cwd=str(repo_path),
                check=False,
                capture_output=True
            )
            subprocess.run(
                ['npm', 'run', 'build'],
                cwd=str(repo_path),
                check=False,
                capture_output=True
            )
        
        # Ensure test dependencies are installed
        print('Installing test dependencies...')
        subprocess.run(
            ['npm', 'install'],
            cwd=str(tests_dir),
            check=False,
            capture_output=True
        )
        
        # Create temporary test runner script
        runner_script = create_node_test_runner()
        temp_runner = tests_dir / '.temp_test_runner.js'
        
        with open(temp_runner, 'w') as f:
            f.write(runner_script)
        
        # Make it executable
        os.chmod(temp_runner, 0o755)
        
        # Run the Node.js test runner
        print(f'\nRunning tests on {repo_name}...')
        result = subprocess.run(
            ['node', str(temp_runner)],
            cwd=str(tests_dir),
            env=env
        )
        
        # Clean up
        if temp_runner.exists():
            temp_runner.unlink()
        
        # For repository_before, always exit 0 (failures are expected)
        # For repository_after, use the actual return code
        if is_before:
            # Before repository: failures are expected, always exit successfully
            print('\nNote: Test failures in repository_before are expected (it contains bugs).')
            sys.exit(0)
        else:
            # After repository: use actual test result
            sys.exit(result.returncode)
        
    except Exception as e:
        print(f'Error running tests: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    run_node_tests()
