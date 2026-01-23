# 1AP159 - Multi-File Upload Chat Application

## Structure
- **repository_before/**: baseline code (text-only chat)
- **repository_after/**: optimized code (multi-file upload chat)
- **tests/**: test suite (`meta.test.jsx`, `run-meta.js`)
- **evaluation/**: evaluation scripts (`evaluation.js`)
- **instances/**: sample/problem instances (JSON)
- **patches/**: patches for diffing
- **trajectory/**: notes or write-up (Markdown)

## Quick Start

### Docker Commands

Three commands using the `evaluation` Docker service:

**1. Run tests (before – expected failures)**
```bash
docker compose run --rm evaluation npm run test:before || :
````
**Expected behavior:**
- Some tests will **FAIL** (repository_before lacks multi-file upload and related behavior)
- Requirement tests (Req 1–19) and behavioral checks will fail on the baseline

**2. Run tests (after – expected all pass)**
```bash
docker compose run --rm evaluation npm run test:after
```
**Expected behavior:**
- All 21 tests should **PASS**
- 19 requirement tests + 2 behavioral tests pass for the multi-file upload implementation

**3. Run evaluation (compares both implementations)**
```bash
docker compose run --rm evaluation
```
This will:
- Run tests for both `repository_before` and `repository_after`
- Compare results and generate a JSON report at `evaluation/reports/YYYY-MM-DD/HH-MM-SS/report.json`
- Display a summary with:
  - **Before tests passed:** false
  - **After tests passed:** true
  - **Success:** true

---

### Run Locally

**Install dependencies**
```bash
npm install
```

**Run tests against repository_before**
```bash
npm run test:before
```

**Run tests against repository_after**
```bash
npm run test:after
```

**Run evaluation locally**
```bash
npm run evaluation
```
Or: `node evaluation/evaluation.js`

---

### Regenerate patch

From repo root:
```bash
git diff --no-index repository_before repository_after > patches/diff.patch
```
