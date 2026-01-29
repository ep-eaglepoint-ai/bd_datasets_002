
## How to Run (Docker)

Use the following commands to build the environment and execute tests or evaluations.

### 1. Before Test
*Runs tests on the original `repository_before` implementation.*
```bash
docker compose up --build test-before
```

### 2. After Test
*Runs tests on your refactored `repository_after` implementation.*
```bash
docker compose up --build test-after
```

### 3. Evaluation & Reports
*Compares both implementations and generates a detailed JSON report.*
```bash
docker compose up --build evaluation
```

