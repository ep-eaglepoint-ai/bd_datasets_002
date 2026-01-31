# Docker Commands for Aquila Platform

## Docker Image Details
- **Repository**: `hailu3548/jr2pzv-app`
- **Available Tags**: 
  - `latest` (main image)
  - `robust-report` (enhanced with report handling)
  - `aquila-ready` (optimized for platform)
  - `host-compatible` (host filesystem compatible)

## 1. Complete Evaluation (All Tests + Report)

### Basic Command
```bash
docker run --rm hailu3548/jr2pzv-app:robust-report
```

### With Volume Mount (Recommended for Aquila)
```bash
docker run --rm -v /path/to/repository:/app hailu3548/jr2pzv-app:robust-report
```

### With Report Output to Host
```bash
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report
```

## 2. Repository Tests Only

### Repository Before Tests
```bash
docker run --rm -w /app/repository_before hailu3548/jr2pzv-app:robust-report go test -v ./...
```

### Repository After Tests
```bash
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
```

### With Volume Mount
```bash
docker run --rm -v /path/to/repository:/app -w /app/repository_before hailu3548/jr2pzv-app:robust-report go test -v ./...
docker run --rm -v /path/to/repository:/app -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...
```

## 3. Evaluation Script Only

### Run Evaluation Script
```bash
docker run --rm hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

### With Volume Mount
```bash
docker run --rm -v /path/to/repository:/app hailu3548/jr2pzv-app:robust-report python3 -m evaluation.evaluation
```

## 4. Report Generation and Verification

### Generate Report Only
```bash
docker run --rm hailu3548/jr2pzv-app:robust-report /app/ensure-report.sh
```

### Copy Report from Container
```bash
# Generate report in container
docker run --rm --name temp-container hailu3548/jr2pzv-app:robust-report

# Copy report to host
docker cp temp-container:/app/evaluation/report.json ./evaluation/report.json

# Clean up
docker rm temp-container
```

## 5. Aquila Platform Integration

### Recommended Platform Configuration
```yaml
# Docker Image
image: hailu3548/jr2pzv-app:robust-report

# Volume Mount
volumes:
  - /codebuild/output:/app

# Command
command: ["/app/ensure-report.sh"]

# Artifacts
artifacts:
  - evaluation/report.json
```

### Buildspec.yml Integration
```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      docker: 20
  pre_build:
    commands:
      - echo Logging in to Docker Hub...
      - docker pull hailu3548/jr2pzv-app:robust-report
  build:
    commands:
      - echo Running evaluation...
      - docker run --rm -v $CODEBUILD_SRC_DIR:/app hailu3548/jr2pzv-app:robust-report
  post_build:
    commands:
      - echo Verifying report...
      - ls -la $CODEBUILD_SRC_DIR/evaluation/
      - if [ -f $CODEBUILD_SRC_DIR/evaluation/report.json ]; then echo "✅ Report found"; else echo "❌ Report missing"; fi

artifacts:
  files:
    - evaluation/report.json
```

## 6. Testing and Verification

### Test All Commands
```bash
# Test basic evaluation
docker run --rm hailu3548/jr2pzv-app:robust-report

# Test repository tests
docker run --rm -w /app/repository_before hailu3548/jr2pzv-app:robust-report go test -v ./...
docker run --rm -w /app/repository_after hailu3548/jr2pzv-app:robust-report go test -v ./...

# Test with volume mount
docker run --rm -v $(pwd):/app hailu3548/jr2pzv-app:robust-report

# Verify report
ls -la evaluation/report.json
head -5 evaluation/report.json
```

## 7. Troubleshooting

### Check Image
```bash
docker images hailu3548/jr2pzv-app
docker inspect hailu3548/jr2pzv-app:robust-report
```

### Pull Latest Image
```bash
docker pull hailu3548/jr2pzv-app:robust-report
```

### Manual Report Creation
```bash
docker run --rm hailu3548/jr2pzv-app:robust-report bash -c "
python3 -m evaluation.evaluation && 
mkdir -p evaluation && 
cp /app/evaluation/report.json ./evaluation/report.json && 
echo 'Report created successfully'
"
```

## 8. Platform-Specific Notes

### For AWS CodeBuild
- Use `hailu3548/jr2pzv-app:robust-report`
- Mount `$CODEBUILD_SRC_DIR` to `/app`
- Artifact path: `evaluation/report.json`

### For Jenkins
```groovy
pipeline {
    agent any
    stages {
        stage('Test') {
            steps {
                script {
                    sh 'docker run --rm -v ${WORKSPACE}:/app hailu3548/jr2pzv-app:robust-report'
                }
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'evaluation/report.json', fingerprint: true
        }
    }
}
```

### For GitHub Actions
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Run Tests
      run: |
        docker run --rm -v ${{ github.workspace }}:/app hailu3548/jr2pzv-app:robust-report
    - name: Upload Report
      uses: actions/upload-artifact@v2
      with:
        name: test-report
        path: evaluation/report.json
```

## 9. Environment Variables

### Optional Environment Variables
```bash
docker run --rm \
  -e REPORT_PATH=/custom/path/report.json \
  -e VERBOSE=true \
  -e TIMEOUT=300 \
  hailu3548/jr2pzv-app:robust-report
```

## 10. Network and Registry Issues

### If Docker Hub Fails
1. Use alternative registry:
   ```bash
   # Alternative: GitHub Container Registry
   docker pull ghcr.io/username/jr2pzv-app:robust-report
   ```

2. Use local image:
   ```bash
   # Build locally if push fails
   docker build -t local-jr2pzv-app .
   docker run --rm local-jr2pzv-app
   ```

3. Use image export/import:
   ```bash
   # Export image
   docker save hailu3548/jr2pzv-app:robust-report -o jr2pzv-app.tar
   
   # Import on target system
   docker load -i jr2pzv-app.tar
   ```

## Summary

The Docker image `hailu3548/jr2pzv-app:robust-report` provides:
- ✅ Complete test execution (83 tests total)
- ✅ Repository-specific testing
- ✅ Evaluation script execution
- ✅ Robust report generation
- ✅ Host filesystem compatibility
- ✅ Volume mount support
- ✅ Platform integration ready

Use the volume mount approach for best results with the Aquila platform.
