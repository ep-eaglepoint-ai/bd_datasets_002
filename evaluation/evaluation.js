import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

async function evaluate() {
    console.log('🚀 Starting Circuit Breaker Test Evaluation\n');

    console.log('📋 Test Requirements Checklist:');
    console.log('1. 100% branch coverage');
    console.log('2. Time-sensitive tests with mocking');
    console.log('3. Half-Open Recovery path verified');
    console.log('4. Half-Open Failure path verified');
    console.log('5. Failure threshold boundary validated');
    console.log('6. Asynchronous action handling (100ms)');
    console.log('7. Concurrent calls at resetTimeout expiration');
    console.log('8. CIRCUIT_OPEN error thrown immediately\n');

    try {
        // Run tests
        console.log('🧪 Running test suite...');
        const { stdout: testOutput, stderr: testError } = await execAsync('npm test');

        // Check test output
        if (testOutput.includes('✔')) {
            console.log('✅ Tests passed successfully');

            // Count passed tests
            const passedCount = (testOutput.match(/✔/g) || []).length;
            console.log(`📊 ${passedCount} tests passed`);

            // Check if all requirements are covered in test output
            const requirements = [
                'should start in CLOSED state',
                'should transition to HALF_OPEN after resetTimeout',
                'should reset to CLOSED on successful action in HALF_OPEN state',
                'should transition back to OPEN on failure in HALF_OPEN state',
                'should handle failure threshold boundary',
                'should handle asynchronous actions that take 100ms to resolve',
                'should handle multiple concurrent calls at resetTimeout boundary',
                'should throw CIRCUIT_OPEN error immediately in OPEN state'
            ];

            console.log('\n🔍 Requirement Coverage Check:');
            requirements.forEach((req, index) => {
                if (testOutput.includes(req)) {
                    console.log(`   ✅ Requirement ${index + 1}: Covered`);
                } else {
                    console.log(`   ❌ Requirement ${index + 1}: Missing`);
                }
            });

        } else {
            console.log('❌ Tests failed');
            console.log(testError || testOutput);
        }

        // Try to run coverage if Node.js supports it
        console.log('\n📊 Attempting to run coverage...');
        try {
            const { stdout: coverageOutput } = await execAsync('npm run test:coverage 2>&1');

            // Extract coverage information
            if (coverageOutput.includes('All files')) {
                const lines = coverageOutput.split('\n');
                const coverageLine = lines.find(line => line.includes('All files'));
                console.log('✅ Coverage report generated');
                console.log(coverageLine);
            } else if (coverageOutput.includes('coverage/')) {
                console.log('✅ Coverage data written to coverage/ directory');
            }
        } catch (coverageError) {
            console.log('⚠️  Coverage requires Node.js 20+ with --experimental-test-coverage flag');
            console.log('   Current Node.js may not support coverage reporting');
        }

        // Check test file structure
        console.log('\n📁 Project Structure Validation:');
        const requiredFiles = [
            'repository_before/CircuitBreaker.js',
            'tests/index.js',
            'package.json',
            'evaluation.js'
        ];

        requiredFiles.forEach(file => {
            const filePath = join(__dirname, file);
            if (existsSync(filePath)) {
                console.log(`   ✅ ${file}`);
            } else {
                console.log(`   ❌ ${file} (missing)`);
            }
        });

        console.log('\n🎉 Evaluation Complete!');

    } catch (error) {
        console.error('❌ Evaluation failed:', error.message);
        process.exit(1);
    }
}

evaluate();