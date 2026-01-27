import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
    'test-1-better-auth.ts',
    'test-2-mongodb.ts',
    'test-3-credentials.ts',
    'test-4-sessions.ts',
    'test-5-no-oauth.ts',
    'test-6-no-external-services.ts',
    'test-7-no-third-party-ui.ts',
    'test-8-functional-auth.ts',
];

async function runTests() {
    console.log('Starting Test Suite...');
    let failed = false;

    for (const test of tests) {
        const testPath = path.join(__dirname, test);
        console.log(`\n----------------------------------------\nExecuting ${test}...`);

        await new Promise<void>((resolve) => {
            // Run with 'tsx' which we installed locally
            const child = spawn('npx', ['tsx', `"${testPath}"`], {
                stdio: 'inherit',
                shell: true
            });

            child.on('close', (code) => {
                if (code !== 0) {
                    console.error(`❌ ${test} FAILED with code ${code}`);
                    failed = true;
                } else {
                    console.log(`✅ ${test} PASSED`);
                }
                resolve();
            });
        });

        if (failed) break; // Optional: stop on first failure? The prompt implies passing "all", effectively requires all green.
    }

    if (failed) {
        console.error('\nTests Failed.');
        process.exit(1);
    } else {
        console.log('\nAll Tests Passed Successfully!');
        process.exit(0);
    }
}

runTests();
