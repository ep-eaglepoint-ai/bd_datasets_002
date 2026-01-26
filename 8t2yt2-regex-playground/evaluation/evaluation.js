#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var os = require("os");
var child_process_1 = require("child_process");
function generateRunId() {
    return Math.random().toString(36).substring(2, 10);
}
function getGitInfo() {
    var gitInfo = { git_commit: "unknown", git_branch: "unknown" };
    try {
        gitInfo.git_commit = (0, child_process_1.execSync)("git rev-parse HEAD", {
            encoding: "utf8",
            timeout: 5000,
            stdio: ["ignore", "pipe", "ignore"],
        })
            .trim()
            .substring(0, 8);
    }
    catch (err) { }
    try {
        gitInfo.git_branch = (0, child_process_1.execSync)("git rev-parse --abbrev-ref HEAD", {
            encoding: "utf8",
            timeout: 5000,
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    }
    catch (err) { }
    return gitInfo;
}
function getEnvironmentInfo() {
    var gitInfo = getGitInfo();
    return {
        node_version: process.version,
        platform: os.platform(),
        os: os.type(),
        os_release: os.release(),
        architecture: os.arch(),
        hostname: os.hostname(),
        git_commit: gitInfo.git_commit,
        git_branch: gitInfo.git_branch,
    };
}
function runTests(repositoryPath, repositoryName) {
    console.log("\n" + "=".repeat(60));
    console.log("RUNNING TESTS: ".concat(repositoryName));
    console.log("=".repeat(60));
    var hasCode = fs.existsSync(path.join(repositoryPath, "src")) ||
        fs.existsSync(path.join(repositoryPath, "package.json"));
    if (!hasCode && repositoryName === "repository_before") {
        console.log("Skipping repository_before as it contains no implementation code (CREATION mode).");
        return {
            success: false,
            exit_code: 1,
            tests: [],
            summary: { total: 0, passed: 0, failed: 0, errors: 0, skipped: 0 },
        };
    }
    try {
        var result = (0, child_process_1.execSync)("npx jest --config jest.config.js --json --no-coverage", {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
            env: __assign(__assign({}, process.env), { NODE_ENV: "test" }),
        });
        var jestOutput = JSON.parse(result);
        var testResults_1 = [];
        jestOutput.testResults.forEach(function (suite) {
            suite.assertionResults.forEach(function (test) {
                var _a;
                testResults_1.push({
                    nodeid: "".concat(repositoryName, "::").concat(test.ancestorTitles.join(" > "), " > ").concat(test.title),
                    name: test.title,
                    outcome: test.status === "passed" ? "passed" : "failed",
                    message: ((_a = test.failureMessages) === null || _a === void 0 ? void 0 : _a.join("\n")) || test.title,
                });
            });
        });
        return {
            success: jestOutput.success,
            exit_code: jestOutput.success ? 0 : 1,
            tests: testResults_1,
            summary: {
                total: jestOutput.numTotalTests,
                passed: jestOutput.numPassedTests,
                failed: jestOutput.numFailedTests,
                errors: 0,
                skipped: 0,
            },
        };
    }
    catch (err) {
        if (err.stdout) {
            try {
                var jestOutput = JSON.parse(err.stdout);
                var testResults_2 = [];
                jestOutput.testResults.forEach(function (suite) {
                    suite.assertionResults.forEach(function (test) {
                        var _a;
                        testResults_2.push({
                            nodeid: "".concat(repositoryName, "::").concat(test.ancestorTitles.join(" > "), " > ").concat(test.title),
                            name: test.title,
                            outcome: test.status === "passed" ? "passed" : "failed",
                            message: ((_a = test.failureMessages) === null || _a === void 0 ? void 0 : _a.join("\n")) || test.title,
                        });
                    });
                });
                return {
                    success: jestOutput.success,
                    exit_code: jestOutput.success ? 0 : 1,
                    tests: testResults_2,
                    summary: {
                        total: jestOutput.numTotalTests,
                        passed: jestOutput.numPassedTests,
                        failed: jestOutput.numFailedTests,
                        errors: 0,
                        skipped: 0,
                    },
                };
            }
            catch (_a) { }
        }
        var errorMessage_1 = err.message || String(err);
        console.error("\nERROR:", errorMessage_1);
        return {
            success: false,
            exit_code: 1,
            tests: [],
            summary: { total: 0, passed: 0, failed: 0, errors: 1, skipped: 0 },
            error: errorMessage_1,
        };
    }
}
function generateOutputPath() {
    var now = new Date();
    var dateStr = now.toISOString().split("T")[0];
    var timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    var outputDir = path.join(process.cwd(), "evaluation", dateStr, timeStr);
    fs.mkdirSync(outputDir, { recursive: true });
    return path.join(outputDir, "report.json");
}
var runId = generateRunId();
var startedAt = new Date();
console.log("\n" + "=".repeat(60));
console.log("TYPESCRIPT AUTHENTICATION SYSTEM EVALUATION");
console.log("=".repeat(60));
console.log("Run ID: ".concat(runId));
console.log("Started at: ".concat(startedAt.toISOString()));
var beforeResults = runTests("repository_before", "repository_before");
var afterResults = runTests("repository_after", "repository_after");
var finishedAt = new Date();
var duration = (finishedAt.getTime() - startedAt.getTime()) / 1000;
var comparison = {
    before_tests_passed: beforeResults.success,
    after_tests_passed: afterResults.success,
    before_total: beforeResults.summary.total,
    before_passed: beforeResults.summary.passed,
    before_failed: beforeResults.summary.failed,
    after_total: afterResults.summary.total,
    after_passed: afterResults.summary.passed,
    after_failed: afterResults.summary.failed,
};
console.log("\n" + "=".repeat(60));
console.log("EVALUATION SUMMARY");
console.log("=".repeat(60));
console.log("\nBefore Implementation (repository_before):");
console.log("  Overall: ".concat(beforeResults.success ? "✅ PASSED" : "❌ FAILED/SKIPPED"));
console.log("  Tests: ".concat(comparison.before_passed, "/").concat(comparison.before_total, " passed"));
console.log("\nAfter Implementation (repository_after):");
console.log("  Overall: ".concat(afterResults.success ? "✅ PASSED" : "❌ FAILED"));
console.log("  Tests: ".concat(comparison.after_passed, "/").concat(comparison.after_total, " passed"));
var success = afterResults.success;
var errorMessage = success ? null : "After implementation tests failed";
var report = {
    run_id: runId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: parseFloat(duration.toFixed(6)),
    success: success,
    error: errorMessage,
    environment: getEnvironmentInfo(),
    results: {
        before: beforeResults,
        after: afterResults,
        comparison: comparison,
    },
};
var outputPath = generateOutputPath();
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log("\n\u2705 Report saved to: ".concat(outputPath));
console.log("\n" + "=".repeat(60));
console.log("EVALUATION COMPLETE");
console.log("=".repeat(60));
console.log("Duration: ".concat(duration.toFixed(2), "s"));
console.log("Success: ".concat(success ? "✅ YES" : "❌ NO"));
process.exit(0);
