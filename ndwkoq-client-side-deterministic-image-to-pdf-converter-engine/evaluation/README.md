# Evaluation Report Location

## For CI/CD Artifact Collection

The evaluation script generates reports in two locations:

1. **Fixed Location (for CI/CD)**: `evaluation/report.json`
   - This is the file that should be uploaded as the test report artifact
   - Always contains the latest evaluation results
   - Overwrites on each run

2. **Timestamped Location (for history)**: `evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json`
   - Preserves historical evaluation results
   - Useful for tracking changes over time
   - Directory structure is excluded from git via .gitignore

## Upload Script Configuration

The CI/CD upload script should target:
```
evaluation/report.json
```

**NOT**:
```
evaluation/package.json  # This is a configuration file, not a test report!
```

## Report Content

The report.json file contains:
- Test execution results (25 tests)
- Success/failure status
- Detailed test outcomes
- Meta-testing analysis
- Environment information
- Execution timing

## Validation

To verify the correct file is being uploaded, check that the report contains:
- `"success": true/false`
- `"results"` object with test data
- `"tests"` array with individual test results
- NOT npm package configuration data