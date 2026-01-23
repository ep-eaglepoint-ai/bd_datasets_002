#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_BEFORE = path.join(__dirname, '../repository_before');
const REPO_AFTER = path.join(__dirname, '../repository_after');
const TESTS_DIR = path.join(__dirname, '../tests');

function runTests(repoPath, repoName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running tests on ${repoName}`);
    console.log('='.repeat(60));

    let output = '';
    let passed = 0;
    let failed = 0;
    let total = 0;
    let success = false;

    try {
        // Set environment variable to tell tests which repo to check
        const env = { 
            ...process.env, 
            TEST_REPO_PATH: repoPath,
            REDIS_HOST: process.env.REDIS_HOST || 'localhost',
            REDIS_PORT: process.env.REDIS_PORT || '6379',
            DB_HOST: process.env.DB_HOST || 'localhost',
            DB_PORT: process.env.DB_PORT || '5432',
            DB_NAME: process.env.DB_NAME || 'inventory_db',
            DB_USER: process.env.DB_USER || 'inventory_user',
            DB_PASSWORD: process.env.DB_PASSWORD || 'inventory_pass'
        };

        // Ensure dependencies are installed for both repository and tests
        try {
            // Install repository dependencies
            const repoDir = repoPath === REPO_BEFORE ? '../repository_before' : '../repository_after';
            execSync('npm install', { 
                cwd: path.join(__dirname, repoDir),
                env: env,
                encoding: 'utf8',
                stdio: 'pipe'
            });
            // Install test dependencies
            execSync('npm install', { 
                cwd: TESTS_DIR,
                env: env,
                encoding: 'utf8',
                stdio: 'pipe'
            });
        } catch (e) {
            // Ignore install errors, try to run tests anyway
        }
        
        output = execSync(
            'npm test 2>&1',
            { 
                cwd: TESTS_DIR,
                env: env,
                encoding: 'utf8',
                shell: '/bin/bash',
                stdio: 'pipe'
            }
        );
        success = true;
    } catch (error) {
        // Test script exits with non-zero on failures, but output is in stdout
        output = error.stdout || error.stderr || error.message || '';
        success = false;
    }

    console.log(output);

    // Parse results from test output
    // Look for "Tests: X failed, Y passed, Z total" format (matching reference)
    const fullMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (fullMatch) {
        failed = parseInt(fullMatch[1], 10);
        passed = parseInt(fullMatch[2], 10);
        total = parseInt(fullMatch[3], 10);
    } else {
        // Try alternative format: "Tests: Y passed, Z total"
        const passedMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
        if (passedMatch) {
            passed = parseInt(passedMatch[1], 10);
            total = parseInt(passedMatch[2], 10);
            failed = 0;
        } else {
            // Fallback: Look for patterns like "Passed: X", "Failed: Y", "Total: Z"
            const passedMatch2 = output.match(/Passed:\s+(\d+)/i);
            const failedMatch2 = output.match(/Failed:\s+(\d+)/i);
            const totalMatch = output.match(/Total:\s+(\d+)/i);

            if (passedMatch2) passed = parseInt(passedMatch2[1]);
            if (failedMatch2) failed = parseInt(failedMatch2[1]);
            if (totalMatch) total = parseInt(totalMatch[1]);

            // If we still couldn't parse, try to infer from success status
            if (total === 0) {
                if (success) {
                    // Try to count test markers
                    const testMatches = output.match(/✓/g);
                    const failMatches = output.match(/✗/g);
                    if (testMatches) passed = testMatches.length;
                    if (failMatches) failed = failMatches.length;
                    total = passed + failed;
                } else {
                    // Tests failed, try to count failures
                    const failMatches = output.match(/✗/g);
                    if (failMatches) failed = failMatches.length;
                    total = failed || 8; // Default to 8 tests if we can't determine
                }
            }
        }
    }

    console.log(`\nParsed results: ${passed} passed, ${failed} failed, ${total} total`);

    return {
        success: failed === 0 && passed > 0,
        passed: passed,
        failed: failed,
        total: total,
        output: output
    };
}

function analyzeCode(repoPath) {
    const metrics = {
        has_distributed_locks: false,
        has_cache_invalidation: false,
        has_repopulation_locks: false,
        has_audit_logging: false,
        uses_for_update: false,
        cache_strategy: 'unknown',
        total_lines: 0
    };

    if (!fs.existsSync(repoPath)) {
        return metrics;
    }

    const servicePath = path.join(repoPath, 'src/inventory-service.ts');
    if (!fs.existsSync(servicePath)) {
        return metrics;
    }

    const content = fs.readFileSync(servicePath, 'utf8');
    metrics.total_lines = content.split('\n').length;

    // Check for distributed locking
    metrics.has_distributed_locks = 
        content.includes('acquireLock') || 
        content.includes('SET') && content.includes('NX') && content.includes('EX');

    // Check for cache invalidation
    metrics.has_cache_invalidation = 
        content.includes('redis.del') || 
        content.includes('cacheKey');

    // Check for repopulation locks (thundering herd protection)
    metrics.has_repopulation_locks = 
        content.includes('repopulateCache') || 
        content.includes('REPOP_LOCK');

    // Check for audit logging
    metrics.has_audit_logging = 
        content.includes('inventory_audit') || 
        content.includes('audit');

    // Check for FOR UPDATE (row-level locking)
    metrics.uses_for_update = 
        content.includes('FOR UPDATE');

    // Determine cache strategy with consistency check
    const hasDel = content.includes('redis.del');
    const hasSet = content.includes('redis.set');
    
    // Extract decrementStock and incrementStock methods more accurately
    const decrementMatch = content.match(/async\s+decrementStock[\s\S]*?(?=async\s+\w+|$)/);
    const incrementMatch = content.match(/async\s+incrementStock[\s\S]*?(?=async\s+\w+|$)/);
    
    const decrementMethod = decrementMatch ? decrementMatch[0] : '';
    const incrementMethod = incrementMatch ? incrementMatch[0] : '';
    
    // Check what each method does (excluding lock operations)
    const decrementHasDel = decrementMethod.includes('redis.del(cacheKey') || decrementMethod.includes('redis.del(cacheKey');
    const decrementHasSet = decrementMethod.includes('redis.set(cacheKey') && !decrementMethod.includes('lock');
    const incrementHasDel = incrementMethod.includes('redis.del(cacheKey');
    const incrementHasSet = incrementMethod.includes('redis.set(cacheKey') && !incrementMethod.includes('lock');
    
    // Check if del and set are used together in same method (invalidate then repopulate)
    const decrementDelThenSet = decrementMethod.includes('redis.del') && 
                                 decrementMethod.includes('redis.set') &&
                                 decrementMethod.indexOf('redis.del') < decrementMethod.indexOf('redis.set');
    const incrementDelThenSet = incrementMethod.includes('redis.del') && 
                                 incrementMethod.includes('redis.set') &&
                                 incrementMethod.indexOf('redis.del') < incrementMethod.indexOf('redis.set');
    
    // Consistent strategy: both methods use del+set together in same pattern
    const isConsistent = decrementDelThenSet && incrementDelThenSet;
    const isInconsistent = (decrementHasDel && !decrementHasSet) || 
                          (!decrementHasDel && decrementHasSet) ||
                          (incrementHasDel && !incrementHasSet) ||
                          (!incrementHasDel && incrementHasSet);
    
    if (hasDel && hasSet && isConsistent) {
        metrics.cache_strategy = 'invalidate_and_repopulate_consistent';
    } else if (hasDel && hasSet && isInconsistent) {
        metrics.cache_strategy = 'invalidate_and_repopulate_inconsistent';
    } else if (hasDel && hasSet) {
        metrics.cache_strategy = 'invalidate_and_repopulate';
    } else if (hasDel && !hasSet) {
        metrics.cache_strategy = 'invalidate_only';
    } else if (hasSet && !hasDel) {
        metrics.cache_strategy = 'update_directly';
    }

    return metrics;
}

function generateReport(beforeResults, afterResults, beforeMetrics, afterMetrics) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    const reportDir = path.join(__dirname, 'reports', dateStr, timeStr);
    fs.mkdirSync(reportDir, { recursive: true });

    // Calculate total count: tests + metrics (Distributed Locks, Repopulation Locks, Audit Logging, FOR UPDATE)
    const totalMetrics = 4; // Distributed Locks, Repopulation Locks, Audit Logging, FOR UPDATE
    const beforeMetricsCount = (beforeMetrics.has_distributed_locks ? 1 : 0) + 
                                (beforeMetrics.has_repopulation_locks ? 1 : 0) + 
                                (beforeMetrics.has_audit_logging ? 1 : 0) + 
                                (beforeMetrics.uses_for_update ? 1 : 0);
    const afterMetricsCount = (afterMetrics.has_distributed_locks ? 1 : 0) + 
                              (afterMetrics.has_repopulation_locks ? 1 : 0) + 
                              (afterMetrics.has_audit_logging ? 1 : 0) + 
                              (afterMetrics.uses_for_update ? 1 : 0);
    
    const beforeTotalPassed = beforeResults.passed + beforeMetricsCount;
    const beforeTotal = beforeResults.total + totalMetrics;
    const afterTotalPassed = afterResults.passed + afterMetricsCount;
    const afterTotal = afterResults.total + totalMetrics;

    const report = {
        run_id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        started_at: now.toISOString(),
        finished_at: new Date().toISOString(),
        environment: {
            node_version: process.version,
            platform: `${process.platform}-${process.arch}`
        },
        before: {
            tests: {
                passed: beforeTotalPassed,
                total: beforeTotal,
                passed_ratio: `${beforeTotalPassed}/${beforeTotal}`
            }
        },
        after: {
            tests: {
                passed: afterTotalPassed,
                total: afterTotal,
                passed_ratio: `${afterTotalPassed}/${afterTotal}`
            }
        },
        success: afterResults.success && 
                 afterMetrics.has_distributed_locks && 
                 afterMetrics.has_repopulation_locks &&
                 (!beforeMetrics.has_distributed_locks || !beforeMetrics.has_repopulation_locks)
    };

    const reportPath = path.join(reportDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Stable artifact locations (matching reference implementation pattern)
    const reportsRoot = path.join(__dirname, 'reports');
    fs.mkdirSync(reportsRoot, { recursive: true });

    const stableReportPath = path.join(reportsRoot, 'report.json');
    fs.writeFileSync(stableReportPath, JSON.stringify(report, null, 2));

    const latestPath = path.join(reportsRoot, 'latest.json');
    fs.writeFileSync(
        latestPath,
        JSON.stringify(
            {
                run_id: report.run_id,
                started_at: report.started_at,
                finished_at: report.finished_at,
                report_path: path.relative(path.join(__dirname, '..'), reportPath),
            },
            null,
            2
        )
    );

    return { report, reportPath, stableReportPath };
}

function main() {
    console.log('='.repeat(60));
    console.log('Distributed Inventory Cache Coherency Evaluation');
    console.log('='.repeat(60));

    // Analyze code
    console.log('\n[1/5] Analyzing repository_before code...');
    const beforeMetrics = analyzeCode(REPO_BEFORE);
    console.log(`  - Total lines: ${beforeMetrics.total_lines}`);
    console.log(`  - Has distributed locks: ${beforeMetrics.has_distributed_locks}`);
    console.log(`  - Has repopulation locks: ${beforeMetrics.has_repopulation_locks}`);
    console.log(`  - Cache strategy: ${beforeMetrics.cache_strategy}`);
    console.log(`  - Uses FOR UPDATE: ${beforeMetrics.uses_for_update}`);

    console.log('\n[2/5] Analyzing repository_after code...');
    const afterMetrics = analyzeCode(REPO_AFTER);
    console.log(`  - Total lines: ${afterMetrics.total_lines}`);
    console.log(`  - Has distributed locks: ${afterMetrics.has_distributed_locks}`);
    console.log(`  - Has repopulation locks: ${afterMetrics.has_repopulation_locks}`);
    console.log(`  - Cache strategy: ${afterMetrics.cache_strategy}`);
    console.log(`  - Uses FOR UPDATE: ${afterMetrics.uses_for_update}`);
    console.log(`  - Has audit logging: ${afterMetrics.has_audit_logging}`);

    // Run tests on before (should fail)
    console.log('\n[3/5] Running tests on repository_before (expected to FAIL)...');
    const beforeResults = runTests(REPO_BEFORE, 'repository_before');

    // Run tests on after (should pass)
    console.log('\n[4/5] Running tests on repository_after (expected to PASS)...');
    const afterResults = runTests(REPO_AFTER, 'repository_after');

    // Calculate totals for display
    const totalMetrics = 4; // Distributed Locks, Repopulation Locks, Audit Logging, FOR UPDATE
    const beforeMetricsCount = (beforeMetrics.has_distributed_locks ? 1 : 0) + 
                                (beforeMetrics.has_repopulation_locks ? 1 : 0) + 
                                (beforeMetrics.has_audit_logging ? 1 : 0) + 
                                (beforeMetrics.uses_for_update ? 1 : 0);
    const afterMetricsCount = (afterMetrics.has_distributed_locks ? 1 : 0) + 
                              (afterMetrics.has_repopulation_locks ? 1 : 0) + 
                              (afterMetrics.has_audit_logging ? 1 : 0) + 
                              (afterMetrics.uses_for_update ? 1 : 0);
    
    const beforeTotalPassed = beforeResults.passed + beforeMetricsCount;
    const beforeTotal = beforeResults.total + totalMetrics;
    const afterTotalPassed = afterResults.passed + afterMetricsCount;
    const afterTotal = afterResults.total + totalMetrics;

    // Generate report
    console.log('\n[5/5] Generating report...');
    const { report, reportPath, stableReportPath } = generateReport(beforeResults, afterResults, beforeMetrics, afterMetrics);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('Evaluation Complete');
    console.log('='.repeat(60));
    console.log(`\nOverall Success: ${report.success}`);
    console.log(`\nReport saved to: ${reportPath}`);
    console.log(`Stable report saved to: ${stableReportPath}`);

    process.exit(report.success ? 0 : 1);
}

if (require.main === module) {
    main();
}

module.exports = { runTests, analyzeCode, generateReport };
