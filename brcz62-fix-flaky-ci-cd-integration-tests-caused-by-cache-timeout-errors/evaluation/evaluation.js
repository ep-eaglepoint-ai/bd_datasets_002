#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'evaluation', 'reports');

function environmentInfo() {
    return {
        "node_version": process.version, // Node.js version
        "platform": process.platform + '-' + process.arch
    };
}

function runTests(repo) {
    // Check if running in a container (more reliable detection)
    const isInContainer = fs.existsSync('/.dockerenv') || 
                          process.env.DOCKER_CONTAINER || 
                          process.env.container ||
                          !fs.existsSync('/proc/1/cgroup') ||
                          process.env.npm_container;
    
    // Check if docker-compose is available
    let dockerComposeAvailable = false;
    try {
        execSync('command -v docker-compose', { encoding: 'utf8', stdio: 'ignore' });
        dockerComposeAvailable = true;
    } catch (e) {
        // docker-compose not found
    }
    
    console.log(`[runTests] repo=${repo}, isInContainer=${isInContainer}, dockerComposeAvailable=${dockerComposeAvailable}`);
    
    if (dockerComposeAvailable && !isInContainer) {
        console.log(`[runTests] Using docker-compose for ${repo}`);
        try {
            const output = execSync(`docker-compose run --rm -e REPO=${repo} app`, {
                cwd: ROOT,
                encoding: 'utf8',
                timeout: 120000 // 2 minutes
            });
            return {
                "passed": true,
                "return_code": 0,
                "output": output.slice(-8000) // truncate to 8000 chars
            };
        } catch (error) {
            return {
                "passed": false,
                "return_code": error.status || 1,
                "output": (error.stdout || '') + (error.stderr || '').slice(-8000)
            };
        }
    } else {
        // Run tests directly using jest
        console.log(`[runTests] Using npm test for ${repo}`);
        try {
            const output = execSync(`REPO=${repo} npm test`, {
                cwd: ROOT,
                encoding: 'utf8',
                timeout: 120000 // 2 minutes
            });
            return {
                "passed": true,
                "return_code": 0,
                "output": output.slice(-8000)
            };
        } catch (error) {
            return {
                "passed": false,
                "return_code": error.status || 1,
                "output": (error.stdout || '') + (error.stderr || '').slice(-8000)
            };
        }
    }
}

function runMetrics(repoPath) {
    // Optional – implement if needed
    return {};
}

function evaluate(repoName) {
    const tests = runTests(repoName);
    const metrics = runMetrics(path.join(ROOT, repoName));
    return {
        "tests": tests,
        "metrics": metrics
    };
}

function runEvaluation() {
    const runId = uuidv4();
    const start = new Date();
    console.log(`[${start.toISOString()}] Starting evaluation (runId: ${runId})`);
    console.log('Running tests for "before" repository...');
    const before = evaluate("before");
    console.log(`Before tests completed: passed=${before.tests.passed}`);
    console.log('Running tests for "after" repository...');
    const after = evaluate("after");
    console.log(`After tests completed: passed=${after.tests.passed}`);
    const comparison = {
        "passed_gate": after.tests.passed,
        "improvement_summary": "After implementation passed correctness tests"
    };
    const end = new Date();

    return {
        "run_id": runId,
        "started_at": start.toISOString(),
        "finished_at": end.toISOString(),
        "duration_seconds": (end - start) / 1000,
        "environment": environmentInfo(),
        "before": before,
        "after": after,
        "comparison": comparison,
        "success": comparison.passed_gate,
        "error": null
    };
}

function main() {
    console.log(`ROOT: ${ROOT}`);
    console.log(`REPORTS: ${REPORTS}`);
    if (!fs.existsSync(REPORTS)) {
        console.log('Creating reports directory...');
        fs.mkdirSync(REPORTS, { recursive: true });
    }
    console.log('Running evaluation...');
    const report = runEvaluation();
    const pathReport = path.join(REPORTS, 'latest.json');
    console.log(`Writing report to ${pathReport}...`);
    fs.writeFileSync(pathReport, JSON.stringify(report, null, 2));
    console.log(`Report written to ${pathReport}`);
    console.log(`Evaluation completed: success=${report.success}`);
    return report.success ? 0 : 1;
}

if (require.main === module) {
    process.exit(main());
}

module.exports = { runEvaluation, main };