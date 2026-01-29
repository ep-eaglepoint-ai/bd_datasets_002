import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

async function evaluate() {
    console.log('🚀 Starting Circuit Breaker Test Evaluation\n');

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

    const requiredFiles = [
        'repository_before/CircuitBreaker.js',
        'repository_after/CircuitBreaker.after.js',
        'package.json',
        'evaluation/evaluation.js'
    ];

    let passedCount = 0;
    let testOutput = '';
    let testError = '';

    try {
        // Run tests
        console.log('🧪 Running test suite...');
        try {
            const result = await execAsync('npm test');
            testOutput = result.stdout;
            testError = result.stderr;
        } catch (err) {
            testOutput = err.stdout || '';
            testError = err.stderr || '';
        }

        // Check test output (Support for both TAP 'ok' and direct '✔')
        const passMarks = (testOutput.match(/ok \d+ - /g) || []).length || (testOutput.match(/✔/g) || []).length;
        passedCount = passMarks;

        if (passedCount > 0) {
            console.log('✅ Tests passed successfully');
            console.log(`📊 ${passedCount} tests passed`);

            console.log('\n🔍 Requirement Coverage Check:');
            requirements.forEach((req, index) => {
                if (testOutput.includes(req)) {
                    console.log(`   ✅ Requirement ${index + 1}: Covered`);
                } else {
                    console.log(`   ❌ Requirement ${index + 1}: Missing`);
                }
            });
        } else {
            console.log('❌ Tests failed or no tests found');
            console.log(testError || testOutput);
        }

        // Try to run coverage
        console.log('\n📊 Attempting to run coverage...');
        try {
            const { stdout: coverageOutput } = await execAsync('npm run test:coverage 2>&1');
            if (coverageOutput.includes('All files')) {
                const lines = coverageOutput.split('\n');
                const coverageLine = lines.find(line => line.includes('All files'));
                console.log('✅ Coverage report generated');
                console.log(coverageLine);
            }
        } catch (coverageError) {
            console.log('⚠️  Coverage data might not be available in summary form.');
        }

        // Check file structure
        console.log('\n📁 Project Structure Validation:');
        requiredFiles.forEach(file => {
            const filePath = join(__dirname, '..', file);
            if (existsSync(filePath)) {
                console.log(`   ✅ ${file}`);
            } else {
                console.log(`   ❌ ${file} (missing)`);
            }
        });

        // Generate report.json
        const evaluationResults = {
            requirements: requirements.map((req, index) => ({
                id: index + 1,
                name: req,
                covered: testOutput.includes(req)
            })),
            tests: {
                total: passedCount,
                passed: passedCount >= 28
            },
            structure: requiredFiles.map(file => ({
                file,
                exists: existsSync(join(__dirname, '..', file))
            }))
        };

        writeFileSync(join(__dirname, 'report.json'), JSON.stringify(evaluationResults, null, 2));
        console.log('\n📝 Report generated at evaluation/report.json');
        console.log('\n🎉 Evaluation Complete!');

    } catch (error) {
        console.error('❌ Evaluation failed:', error.message);
        process.exit(1);
    }
}

evaluate();