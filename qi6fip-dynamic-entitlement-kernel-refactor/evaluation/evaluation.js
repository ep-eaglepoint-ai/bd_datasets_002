import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mapping of test names to requirements
 */
const REQUIREMENT_MAPPING = {
    'STRICT: Must deny access by THROWING if database fails': 'Req 1: Fail-Closed',
    'STRICT: Must support detailed mode with reason codes': 'Req 2: Explainability',
    'STRICT: Logic layer must be importable without infrastructure (Deterministic Testing)': 'Req 3: Logic Abstraction',
    'STRICT: ADMIN_DELETE should implicitly grant READ': 'Req 4: Hierarchy',
    'STRICT: Must NEVER retrieve an expired permission from cache as valid': 'Req 5: Temporal Accuracy',
    'STRICT: Must eliminate messy nested callback/some calls for clean pipeline': 'Req 6: Code Quality',
    'STRICT: Secure membership check order': 'Req 7: Race Condition',
    'STRICT: Handle deleted user with stale cache correctly': 'Req 8: Adversarial Safety',
    'STRICT: ADMIN_ALL should implicitly grant WRITE': 'Req 9: Wildcard Override'
};

function runTest(repo) {
    console.log(`Running evaluation for: ${repo}...`);
    const cmd = `TEST_REPO=${repo} NODE_OPTIONS=--experimental-vm-modules jest tests/unified_verification.test.js --testEnvironment=node --json`;

    try {
        const stdout = execSync(cmd, { stdio: 'pipe' }).toString();
        return JSON.parse(stdout);
    } catch (err) {
        // Jest returns non-zero exit code if tests fail, but we still get the JSON in stdout
        if (err.stdout) {
            try {
                return JSON.parse(err.stdout.toString());
            } catch (e) {
                return { numFailedTests: 1, testResults: [] };
            }
        }
        return { numFailedTests: 1, testResults: [] };
    }
}

function parseResults(results) {
    const compliance = {};
    Object.values(REQUIREMENT_MAPPING).forEach(req => compliance[req] = 'FAIL');

    if (results && results.testResults && results.testResults[0]) {
        results.testResults[0].assertionResults.forEach(assertion => {
            const req = REQUIREMENT_MAPPING[assertion.title];
            if (req) {
                compliance[req] = assertion.status === 'passed' ? 'PASS' : 'FAIL';
            }
        });
    }
    return compliance;
}

function main() {
    console.log('='.repeat(60));
    console.log('ENTITLEMENT KERNEL EVALUATION ENGINE');
    console.log('='.repeat(60));
    console.log();

    const beforeResults = runTest('before');
    const afterResults = runTest('after');

    const beforeCompliance = parseResults(beforeResults);
    const afterCompliance = parseResults(afterResults);

    const report = {
        timestamp: new Date().toISOString(),
        repositories: {
            before: {
                totalTests: 9,
                passed: Object.values(beforeCompliance).filter(v => v === 'PASS').length,
                compliance: beforeCompliance
            },
            after: {
                totalTests: 9,
                passed: Object.values(afterCompliance).filter(v => v === 'PASS').length,
                compliance: afterCompliance
            }
        },
        summary: {
            improvement: `${Object.values(afterCompliance).filter(v => v === 'PASS').length - Object.values(beforeCompliance).filter(v => v === 'PASS').length} Requirements Fixed`
        }
    };

    // Save report
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, 'evaluation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Console output
    console.log('\nFinal Compliance Report:');
    console.log('-'.repeat(60));
    console.log(`${'Requirement'.padEnd(40)} | ${'Before'.padEnd(8)} | ${'After'}`);
    console.log('-'.repeat(60));

    Object.keys(REQUIREMENT_MAPPING).forEach(title => {
        const req = REQUIREMENT_MAPPING[title];
        const b = beforeCompliance[req] === 'PASS' ? '✅ PASS' : '❌ FAIL';
        const a = afterCompliance[req] === 'PASS' ? '✅ PASS' : '❌ FAIL';
        console.log(`${req.padEnd(40)} | ${b.padEnd(8)} | ${a}`);
    });

    console.log('-'.repeat(60));
    console.log(`TOTAL PASSED: ${report.repositories.before.passed}/9 | ${report.repositories.after.passed}/9`);
    console.log('='.repeat(60));
    console.log(`Report generated at: ${reportPath}\n`);
}

main();
