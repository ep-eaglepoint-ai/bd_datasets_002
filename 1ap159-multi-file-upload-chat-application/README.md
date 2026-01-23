# 1AP159 - Multi-File Upload Chat Application

**Category:** sft

## Overview
- Task ID: 1AP159
- Title: Multi-File Upload Chat Application
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: 1ap159-multi-file-upload-chat-application

## Requirements
- The chat application must support drag-and-drop and click-to-select file uploads.
- Supported file formats: jpg, png, gif, pdf, txt.
- A maximum of 4 files per message is allowed.
- Per-file size limit: 3MB.
- Total upload size per message: 8MB.
- Each file must upload independently with its own progress indicator.
- All selected files must upload in parallel, not sequentially.
- Progress must increase smoothly from 0% to 100%.
- Each file must display a simulated upload speed (e.g., 800 KB/s – 1.5 MB/s).
- Progress bars must animate smoothly using CSS transitions.
- Before sending a message:  Display selected files in a preview area.  Show file name (truncate if long).  Show file size.  Provide a remove (×) button per file.  No upload progress is shown at this stage.
- After sending a message:  Display a progress bar per file.  Show percentage completion.  Show upload speed.  Display a spinner icon while uploading.
- After completion:  Replace progress indicators with a checkmark (✓).
- Messages must appear in the chat immediately (optimistic UI).
- The Send button must be disabled while files are uploading.
- Once all files complete, the message state must change to "complete".
- The application must use useReducer for state management.
- useState must not be used for upload or message state.
- No external libraries for uploads or state management.

## Metadata
- Programming Languages: Javascript
- Frameworks: (none)
- Libraries: (none)
- Databases: (none)
- Tools: (none)
- Best Practices: (none)
- Performance Metrics: (none)
- Security Standards: (none)

## Structure
- **package.json** (root): drives meta-tests; `test`, `test:before`, `test:after`, `test:meta`
- **repository_before/**: baseline React app (text-only chat)
- **repository_after/**: Ground Truth (multi-file upload chat)
- **tests/**: meta-tests (`meta.test.jsx`, `run-meta.js`); `test:after` asserts all 19 requirements
- **evaluation/**: `evaluation.js` runs tests on both repos, writes `evaluation/reports/yyyy-mm-dd/HH-mm-ss/report.json`
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
From project root:
- `npm install && npm run test:meta` — run meta-tests (before must fail, after must pass)
- `npm run test:before` — run tests against repository_before only
- `npm run test:after` — run tests against repository_after only (all 19 requirements must pass)
- `npm run evaluation` — run tests on both repos, write report (after `npm install`)

## Docker

Three containers: **before**, **after**, **evaluation**.

**Run all three:**
```bash
docker compose up --build
```
- **before** (repository_before, baseline): http://localhost:3000
- **after** (repository_after, multi-file upload): http://localhost:3001
- **evaluation**: runs `node evaluation/evaluation.js` (tests both repos, writes `evaluation/reports/yyyy-mm-dd/HH-mm-ss/report.json`), exits 0 if after passes else 1

**Run only evaluation** (tests both repos, writes report):
```bash
docker compose run --rm evaluation
# or build first:
docker compose build evaluation && docker compose run --rm evaluation
```
Reports appear in `evaluation/reports/yyyy-mm-dd/HH-mm-ss/report.json` (volume-mounted).

**Separate test commands** (override evaluation container):
```bash
# Tests against repository_before only (expect failures)
docker compose run --rm evaluation npm run test:before

# Tests against repository_after only (expect all 21 pass)
docker compose run --rm evaluation npm run test:after
```
Build first if needed: `docker compose build evaluation`

**Run only the apps (before + after):**
```bash
docker compose up before after --build
```

- `Dockerfile` — evaluation image (root deps, `node evaluation/evaluation.js` by default)
- `Dockerfile.before` — repository_before (baseline) on port 3000
- `Dockerfile.app` — repository_after (multi-file upload) on port 3000 (mapped to host 3001)
- `docker-compose.yml` — services `before`, `after`, `evaluation`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
