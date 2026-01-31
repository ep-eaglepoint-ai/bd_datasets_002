
import { exec } from 'child_process';
import path from 'path';

describe('Meta Test: User Test Suite', () => {
  it('should run all split test files successfully', (done) => {
    // Run all .test.ts files in repository_after/tests
    const command = `npx jest repository_after/tests/*.test.ts --no-cache --runInBand --no-colors`;

    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      console.log('--- Child Process Output ---');
      console.log('stdout:', stdout);
      console.log('stderr:', stderr);
      
      try {
        expect(error).toBeNull();
        const output = stdout + stderr;
        expect(output).toContain('PASS');
        // Verify all 3 test files were executed
        expect(output).toContain('auth.test.ts');
        expect(output).toContain('refresh.test.ts');
        expect(output).toContain('rbac.test.ts');
        done();
      } catch (err) {
        done(err);
      }
    });
  }, 60000); // 60s timeout
});
