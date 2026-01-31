
import { exec } from 'child_process';
import path from 'path';

describe('Meta Test: User Test Suite', () => {
  it('should run the repository_after tests successfully', (done) => {
    // Jest expects forward slashes for patterns even on Windows to avoid regex escaping issues
    const testFile = path.join('repository_after', 'tests', 'middleware.test.ts').replace(/\\/g, '/');
    // Using npx jest directly to run the specific test file
    const command = `npx jest ${testFile} --no-cache --runInBand --no-colors`;

    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      // Log output for debugging
      console.log('--- Child Process Output ---');
      console.log('stdout:', stdout);
      console.log('stderr:', stderr);
      console.log('error:', error);
      console.log('----------------------------');

      try {
        expect(error).toBeNull();
        // Check for success indicators in the output (Jest often writes to stderr)
        const output = stdout + stderr;
        // Simple check for "KEYWORD passed" or "Test Suites: X passed"
        // The output captured: "Test Suites: 1 passed, 1 total"
        expect(output).toContain('PASS');
        done();
      } catch (err) {
        done(err); // Pass assertion errors to done
      }
    });
  }, 60000); // 60s timeout
});
