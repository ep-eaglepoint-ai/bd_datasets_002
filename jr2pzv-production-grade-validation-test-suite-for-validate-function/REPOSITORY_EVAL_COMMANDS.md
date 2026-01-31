# Docker Commands: Repository After & Evaluation Folders

## 🎯 Specific Commands for Repository After & Evaluation

### 1. Repository After Tests Only

#### Basic Repository After Tests
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
```

#### With Volume Mount (Recommended)
```bash
docker run --rm -v /path/to/your/repository:/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
```

#### Local Testing
```bash
docker run --rm -v $(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
```

#### Specific Test Package
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./validator/...
```

#### Run with JSON Output
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v -json ./... > repository_after_results.json
```

### 2. Evaluation Folder Only

#### Run Evaluation Script
```bash
docker run --rm hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

#### With Volume Mount (Recommended)
```bash
docker run --rm -v /path/to/your/repository:/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

#### Local Testing
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

#### Run Specific Evaluation Functions
```bash
docker run --rm hailu3548/jr2pzv-app:robust-report python3 -c "
import evaluation.evaluation as eval
eval.run_repository_tests('/app/repository_after')
eval.generate_report()
"
```

#### Evaluation with Custom Output
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation --output-dir ./custom_output
```

### 3. Combined Commands

#### Run Repository After Tests THEN Evaluation
```bash
# Step 1: Run repository tests
docker run --rm -v $(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...

# Step 2: Run evaluation
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

#### Single Command for Both
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report bash -c "
cd /app/repository_after && go test -v ./... && 
cd /app && python3 -m evaluation.evaluation
"
```

### 4. Report Generation for Each

#### Repository After Test Report
```bash
docker run --rm -v $(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v -json ./... > repository_after_report.json
```

#### Evaluation Report Only
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation --report-only
```

#### Both Reports Combined
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report bash -c "
mkdir -p reports
cd /app/repository_after && go test -v -json ./... > /app/reports/repository_after_tests.json
cd /app && python3 -m evaluation.evaluation
cp /app/evaluation/report.json /app/reports/evaluation_report.json
echo 'Reports generated in reports/ directory'
"
```

### 5. Aquila Platform Specific

#### Repository After Tests for Aquila
```bash
docker run --rm -v $CODEBUILD_SRC_DIR:/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
```

#### Evaluation for Aquila
```bash
docker run --rm -v $CODEBUILD_SRC_DIR:/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

#### Aquila Buildspec.yml
```yaml
version: 0.2

phases:
  pre_build:
    commands:
      - docker pull hailu3548/jr2pzv-app:robust-report
  build:
    commands:
      # Repository After Tests
      - echo "Running repository_after tests..."
      - docker run --rm -v $CODEBUILD_SRC_DIR:/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
      
      # Evaluation
      - echo "Running evaluation..."
      - docker run --rm -v $CODEBUILD_SRC_DIR:/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
      
      # Verify Reports
      - ls -la $CODEBUILD_SRC_DIR/evaluation/
  post_build:
    commands:
      - echo "Verification complete"
artifacts:
  files:
    - evaluation/report.json
```

### 6. Quick Test Commands

#### Test Repository After Only
```bash
docker run --rm -v $(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./validator/
```

#### Test Evaluation Only
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -c "
import evaluation.evaluation as eval
print('Testing evaluation module...')
eval.main()
"
```

#### Quick Verification
```bash
# Verify repository after structure
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report ls -la /app/repository_after/

# Verify evaluation structure
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report ls -la /app/evaluation/

# Test Go modules
docker run --rm -v $(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go mod tidy
```

### 7. Debugging Commands

#### Debug Repository After
```bash
docker run --rm -v $(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report bash -c "
echo 'Current directory:' && pwd
echo 'Go version:' && go version
echo 'Directory contents:' && ls -la
echo 'Go modules:' && go mod download
echo 'Running tests:' && go test -v ./...
"
```

#### Debug Evaluation
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report bash -c "
echo 'Python version:' && python3 --version
echo 'Current directory:' && pwd
echo 'Evaluation directory:' && ls -la /app/evaluation/
echo 'Running evaluation:' && python3 -m evaluation.evaluation
"
```

### 8. File Paths Reference

#### Repository After Structure
```
/app/repository_after/
├── __init__.py
├── go.mod
└── validator/
    ├── validator.go
    └── validator_test.go
```

#### Evaluation Structure
```
/app/evaluation/
├── __init__.py
├── evaluation.py
├── report.json
└── status.txt
```

### 9. Environment Variables

#### For Repository After Tests
```bash
docker run --rm -v $(pwd):/app -w /app/repository_after \
  -e GO111MODULE=on \
  -e CGO_ENABLED=0 \
  hailu3548/jr2pzv-app:robust-report go test -v ./...
```

#### For Evaluation
```bash
docker run --rm -v $(pwd):/app \
  -e PYTHONPATH=/app \
  -e REPORT_PATH=/app/evaluation/report.json \
  hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

## Summary

- **Repository After**: Use `-w /app/repository_after` with Go test commands
- **Evaluation**: Use `python3 -m evaluation.evaluation` from `/app`
- **Volume Mount**: Always use `-v /path/to/repo:/app` for host access
- **Aquila Platform**: Use `$CODEBUILD_SRC_DIR` instead of local paths
- **Reports**: Repository tests → JSON output, Evaluation → evaluation/report.json
