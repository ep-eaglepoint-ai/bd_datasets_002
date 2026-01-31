# Precise Docker Commands Based on Actual File Structure

## 📁 Actual File Structure

```
/app/
├── repository_after/
│   ├── __init__.py
│   ├── go.mod (module: scenario-014-go-shadowed-test)
│   └── validator/
│       ├── validator.go (2073 bytes)
│       └── validator_test.go (10157 bytes)
├── evaluation/
│   ├── evaluation.py (11424 bytes)
│   ├── report.json (87371 bytes)
│   ├── status.txt (80 bytes)
│   └── __pycache__/
└── Dockerfile
```

## 🎯 Repository After Commands

### 1. Basic Go Tests
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
```

### 2. Tests with JSON Output
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v -json ./...
```

### 3. Save JSON Output to File
```bash
docker run --rm -v $(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v -json ./... > repository_after_results.json
```

### 4. Run Specific Validator Tests
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./validator/
```

### 5. Run Specific Test Function
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v -run TestValidate ./validator/
```

### 6. Test with Module Verification
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report bash -c "
go mod tidy && go mod verify && go test -v ./...
"
```

### 7. Test Coverage Report
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v -cover ./validator/
```

## 🐍 Evaluation Commands

### 1. Run Full Evaluation
```bash
docker run --rm hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

### 2. Evaluation with Volume Mount
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

### 3. Run Evaluation Script Directly
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 /app/evaluation/evaluation.py
```

### 4. Evaluation with Custom Output
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -c "
import sys
sys.path.append('/app')
import evaluation.evaluation as eval
eval.main()
"
```

### 5. Debug Evaluation
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report bash -c "
echo 'Python version:' && python3 --version
echo 'Current directory:' && pwd
echo 'Evaluation directory contents:' && ls -la /app/evaluation/
echo 'Running evaluation...' && python3 -m evaluation.evaluation
"
```

## 🔄 Combined Commands

### 1. Repository Tests + Evaluation
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report bash -c "
echo '=== Running Repository After Tests ===' &&
cd /app/repository_after &&
go test -v ./... &&
echo '=== Running Evaluation ===' &&
cd /app &&
python3 -m evaluation.evaluation
"
```

### 2. Separate Reports
```bash
# Step 1: Repository after tests with JSON output
docker run --rm -v $(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v -json ./... > repository_after_tests.json

# Step 2: Full evaluation
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

### 3. All Tests in One Command
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report bash -c "
mkdir -p reports &&
cd /app/repository_after &&
go test -v -json ./... > /app/reports/repository_after_detailed.json &&
cd /app &&
python3 -m evaluation.evaluation &&
cp /app/evaluation/report.json /app/reports/evaluation_summary.json &&
echo 'All reports saved in reports/ directory'
"
```

## ☁️ Aquila Platform Commands

### 1. Repository After Tests Only
```bash
docker run --rm -v $CODEBUILD_SRC_DIR:/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
```

### 2. Evaluation Only
```bash
docker run --rm -v $CODEBUILD_SRC_DIR:/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

### 3. Aquila Buildspec.yml
```yaml
version: 0.2

phases:
  pre_build:
    commands:
      - echo Pulling Docker image...
      - docker pull hailu3548/jr2pzv-app:robust-report
  build:
    commands:
      # Repository After Tests
      - echo "=== Running Repository After Tests ==="
      - docker run --rm -v $CODEBUILD_SRC_DIR:/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
      
      # Evaluation (includes both repositories)
      - echo "=== Running Full Evaluation ==="
      - docker run --rm -v $CODEBUILD_SRC_DIR:/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
      
      # Verify outputs
      - echo "=== Verifying Reports ==="
      - ls -la $CODEBUILD_SRC_DIR/evaluation/
      - if [ -f $CODEBUILD_SRC_DIR/evaluation/report.json ]; then echo "✅ Evaluation report found"; else echo "❌ Evaluation report missing"; fi
  post_build:
    commands:
      - echo "Build completed successfully"
artifacts:
  files:
    - evaluation/report.json
    - repository_after_tests.json
```

## 🔍 File-Specific Commands

### 1. Test Specific Go Files
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./validator/validator_test.go
```

### 2. Run with Go Module Info
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report bash -c "
echo 'Module info:' && cat go.mod
echo 'Go version:' && go version
echo 'Running tests:' && go test -v ./...
"
```

### 3. Check Test File Structure
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report bash -c "
echo 'Repository After Structure:'
find /app/repository_after -type f -name '*.go' -exec echo '  {}' \;
echo ''
echo 'Evaluation Structure:'
find /app/evaluation -type f -name '*.py' -exec echo '  {}' \;
"
```

## 🚀 Quick Test Commands

### 1. Test Repository After Only
```bash
docker run --rm -v $(pwd):/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./validator/
```

### 2. Test Evaluation Only
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report python3 -c "
import sys
sys.path.append('/app')
import evaluation.evaluation
evaluation.evaluation.main()
"
```

### 3. Verify Everything Works
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report bash -c "
echo '=== Testing Repository After ==='
cd /app/repository_after && go test -v ./... && echo '✅ Repository After OK' || echo '❌ Repository After Failed'

echo '=== Testing Evaluation ==='
cd /app && python3 -m evaluation.evaluation && echo '✅ Evaluation OK' || echo '❌ Evaluation Failed'

echo '=== Checking Reports ==='
ls -la /app/evaluation/report.json && echo '✅ Report exists' || echo '❌ Report missing'
"
```

## 📊 Expected Outputs

### Repository After Tests
- **Console Output**: Detailed test results
- **JSON Output**: Structured test data (if using -json flag)
- **Coverage**: Coverage reports (if using -cover flag)

### Evaluation
- **Main Report**: `/app/evaluation/report.json` (87KB)
- **Status File**: `/app/evaluation/status.txt` (80 bytes)
- **Console Output**: Progress and verification messages

## 🎯 Key Points

1. **Repository After**: 
   - Module: `scenario-014-go-shadowed-test`
   - Main tests: `./validator/validator_test.go`
   - Working directory: `/app/repository_after`

2. **Evaluation**:
   - Main script: `/app/evaluation/evaluation.py`
   - Output: `/app/evaluation/report.json`
   - Working directory: `/app`

3. **Volume Mount**: Always use `-v /path/to/repo:/app` for host access

4. **Aquila Platform**: Use `$CODEBUILD_SRC_DIR` instead of local paths
