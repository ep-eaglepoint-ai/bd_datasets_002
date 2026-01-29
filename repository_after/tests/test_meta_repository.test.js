import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const targetDir = path.join(repoRoot, 'repository_after');

describe('Meta-test: Repository Structure Validation', () => {
    it('should have the required core files', () => {
        const requiredFiles = [
            'CircuitBreaker.after.js',
            'tests'
        ];
        requiredFiles.forEach(file => {
            assert.ok(fs.existsSync(path.join(targetDir, file)), `Missing required file: ${file}`);
        });
    });

    it('should have all requirement-specific test files', () => {
        const testDir = path.join(targetDir, 'tests');
        const testFiles = fs.readdirSync(testDir);

        const expectedPrefixes = [
            'req1_coverage',
            'req2_time_mocking',
            'req3_recovery',
            'req4_failure',
            'req5_threshold',
            'req6_async',
            'req7_concurrent',
            'req8_open_error'
        ];

        expectedPrefixes.forEach(prefix => {
            const found = testFiles.some(f => f.startsWith(prefix));
            assert.ok(found, `Missing test file for: ${prefix}`);
        });
    });

    it('should have a clean CircuitBreaker.js export', async () => {
        const cbPath = path.join(targetDir, 'CircuitBreaker.after.js');
        const mod = await import(`file://${cbPath}`);
        assert.ok(mod.CircuitBreaker, 'CircuitBreaker class is not exported');
    });
});
