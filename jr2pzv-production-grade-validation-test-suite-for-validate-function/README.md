# 🚀 Go Validation Suite

### 1️⃣ Repository Before (Baseline)
```bash
docker build -t validator-app . && docker run --rm validator-app go test -v ./repository_before/...
```

### 2️⃣ Repository After (Enhanced)
```bash
docker build -t validator-app . && docker run --rm validator-app go test -v ./repository_after/...
```

### 3️⃣ Complete Evaluation
```bash
docker build -t validator-app . && docker run --rm validator-app
```
