# Test Evaluation System

This directory contains the evaluation system for the Music Library Intelligence application.

## Files

- `evaluation.js` - Main evaluation script that runs all tests and generates comprehensive reports
- `evaluation.py` - Python placeholder (not implemented)
- `reports/` - Directory where evaluation reports are generated

## Usage

### Run Evaluation

From the repository root:
```bash
node evaluation/evaluation.js
```

From the repository_after directory:
```bash
npm run evaluate
```

### Generated Reports

The evaluation script generates a comprehensive JSON report in `evaluation/reports/report.json` containing:

- **Run Information**: Unique run ID and timestamp
- **Environment Details**: Node.js version, platform, architecture, hostname, npm version, Jest version
- **Test Summary**: Total test suites, passed/failed counts, total tests, duration
- **Detailed Test Results**: Individual test suite results with test counts
- **Error Capture**: Console errors and warnings from test execution

## Report Structure

```json
{
  "runId": "unique-run-id",
  "timestamp": "2026-01-29T21:24:07.766Z",
  "environment": {
    "nodeVersion": "v22.16.0",
    "platform": "win32",
    "architecture": "x64",
    "hostname": "DESKTOP-H4PF8QC",
    "npmVersion": "10.9.2",
    "jestVersion": "29.7.0",
    "projectPath": "/path/to/project"
  },
  "summary": {
    "totalTestSuites": 9,
    "passedTestSuites": 9,
    "failedTestSuites": 0,
    "totalTests": 68,
    "passedTests": 68,
    "failedTests": 0,
    "skippedTests": 0,
    "totalDuration": 8560
  },
  "testSuites": [...],
  "errors": [...],
  "warnings": [...]
}
```

## Features

- **Comprehensive Test Execution**: Runs all Jest tests in the project
- **Environment Capture**: Records system and tool versions for reproducibility
- **Error Collection**: Captures console errors and warnings during test execution
- **Detailed Reporting**: Provides both summary and detailed test results
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Flexible Execution**: Can be run from project root or repository_after directory

## Current Test Coverage

The evaluation system currently captures results from:

- 9 test suites
- 68 individual tests
- Component tests (AddToPlaylistModal)
- Service tests (playlist, tag, search, metadata, duplicate detection)
- Integration tests (playlist integration, tag-based playlists)
- Utility tests (format utilities)

All tests are currently passing with comprehensive coverage of the application's functionality.