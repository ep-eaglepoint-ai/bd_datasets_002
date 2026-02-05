# Evaluation System

This evaluation system runs Jest tests and generates detailed reports with environment metadata.

## Quick Start

### Option 1: Using npm script (Recommended)
```bash
npm run evaluate
```

### Option 2: Using Node.js runner
```bash
node evaluation/run-evaluation.js
```

### Option 3: Direct TypeScript execution
```bash
npx ts-node evaluation/evaluation.ts
```

## Custom Output Path

You can specify a custom output path for the report:

```bash
npm run evaluate -- --output my-custom-report.json
```

## Report Structure

The evaluation generates a JSON report with the following structure:

```json
{
  "run_id": "abc12345",
  "started_at": "2024-01-28T10:30:00.000Z",
  "finished_at": "2024-01-28T10:31:15.000Z",
  "duration_seconds": 75.123,
  "success": true,
  "environment": {
    "node_version": "v18.17.0",
    "npm_version": "9.6.7",
    "platform": "win32",
    "os": "Windows_NT",
    "architecture": "x64",
    "hostname": "DESKTOP-ABC123",
    "jest_version": "^29.7.0",
    "typescript_version": "^5",
    "git_commit": "abc12345",
    "git_branch": "main"
  },
  "results": {
    "success": true,
    "exit_code": 0,
    "tests": [
      {
        "nodeid": "should render basic header without dataset info",
        "name": "should render basic header without dataset info",
        "outcome": "passed",
        "duration": 76
      }
    ],
    "summary": {
      "total": 80,
      "passed": 80,
      "failed": 0,
      "errors": 0,
      "skipped": 0
    },
    "duration": 13.5
  }
}
```

## Report Location

By default, reports are saved to:
```
evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json
```

For example:
```
evaluation/reports/2024-01-28/10-30-15/report.json
```

## Environment Information

The report includes comprehensive environment information:

- **Node.js version**: Runtime version
- **npm version**: Package manager version
- **Platform**: Operating system platform
- **Architecture**: CPU architecture
- **Jest version**: Testing framework version
- **TypeScript version**: Language version
- **Git information**: Current commit and branch
- **Hostname**: Machine identifier

## Test Results

Each test result includes:

- **nodeid**: Full test identifier
- **name**: Test name
- **outcome**: Result (passed/failed/error/skipped)
- **duration**: Execution time in milliseconds

## Summary Statistics

The report provides summary statistics:

- **total**: Total number of tests
- **passed**: Number of passed tests
- **failed**: Number of failed tests
- **errors**: Number of tests with errors
- **skipped**: Number of skipped tests

## Integration with CI/CD

The evaluation script returns appropriate exit codes:

- **0**: All tests passed
- **1**: Some tests failed or evaluation error

This makes it suitable for CI/CD pipelines:

```bash
npm run evaluate && echo "All tests passed!" || echo "Tests failed!"
```

## Docker Integration

You can also run evaluation in Docker:

```bash
# Run evaluation in Docker
docker-compose run --rm test npm run evaluate

# Or run the evaluation runner
docker-compose run --rm app node evaluation/run-evaluation.js
```