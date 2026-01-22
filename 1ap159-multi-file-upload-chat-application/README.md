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
- repository_before/: baseline code (`__init__.py`)
- repository_after/: optimized code (`__init__.py`)
- tests/: test suite (`__init__.py`)
- evaluation/: evaluation scripts (`evaluation.py`)
- instances/: sample/problem instances (JSON)
- patches/: patches for diffing
- trajectory/: notes or write-up (Markdown)

## Quick start
- Run tests locally: `python -m pytest -q tests`
- With Docker: `docker compose up --build --abort-on-container-exit`
- Add dependencies to `requirements.txt`

## Notes
- Keep commits focused and small.
- Open a PR when ready for review.
