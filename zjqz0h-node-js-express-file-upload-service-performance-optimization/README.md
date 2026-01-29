# ZJQZ0H - Node.js Express File Upload Service - Performance Optimization

**Category:** sft

## Overview
- Task ID: ZJQZ0H
- Title: Node.js Express File Upload Service - Performance Optimization
- Category: sft
- Repository: ep-eaglepoint-ai/bd_datasets_002
- Branch: zjqz0h-node-js-express-file-upload-service-performance-optimization

## Requirements
- File reading must use createReadStream() instead of readFileSync() or readFile() with full buffer. The buggy code uses synchronous file operations that block the event loop and load entire files into memory. To verify: upload a 100MB file while simultaneously hitting the /health endpoint - the health check should respond in under 100ms, not timeout.
- File writing must use createWriteStream() with pipe() instead of writeFileSync() or writeFile() with full buffer. The buggy code buffers the entire file in memory before writing to disk. To verify: memory profiling during a 100MB upload should show memory increase under 50MB, not 100MB+ spike.
- Image processing with Sharp must run in a worker thread or use Sharp's streaming API to prevent blocking the main event loop. The buggy code calls sharp().resize().toBuffer() on the main thread which freezes all request handling. To verify: during a 20MP image resize, other API endpoints should respond normally within 100ms.
- Database operations must reuse connections from a Pool instance, not create new Client() per request. The buggy code creates a new pg.Client() for each upload and never releases connections. To verify: 50 concurrent uploads should use maximum 20 connections from the pool, not create 50 separate connections.
- File uploads must use Multer's diskStorage engine with streaming, not memoryStorage(). The buggy code uses multer.memoryStorage() which loads the entire file into RAM before processing. To verify: uploading a 100MB file should not increase Node.js heap usage by 100MB.
- File saving must write to a temporary file first, then perform an atomic rename to the final location. The buggy code writes directly to the final path, leaving partial files when crashes occur. To verify: kill the server process mid-upload - no partial files should exist in the upload directory, only in temp.
- Filenames must be uniquely generated using UUID or timestamp-hash combination, not use the original filename directly. The buggy code uses req.file.originalname causing concurrent uploads of same-named files to overwrite each other. To verify: two simultaneous uploads of "test.jpg" should create two separate files with unique names.
- Available disk space must be checked before accepting an upload using fs.statfs() or equivalent. The buggy code has no disk space validation, causing writes to fail mid-stream when disk is full. To verify: with 10MB free disk space, attempting a 50MB upload should fail fast with an appropriate error message, not crash mid-write.
- Thumbnail generation must happen asynchronously after the upload response is sent, using a background task queue or fire-and-forget pattern. The buggy code generates thumbnails synchronously before responding, adding 3-5 seconds to every image upload. To verify: image upload response time should not include thumbnail generation time - response should return immediately with a "thumbnail pending" status.
- Server must configure appropriate request timeouts for large file uploads. The buggy code uses Express default timeout (2 minutes) which causes failures on slow connections uploading large files. To verify: a 100MB upload on a simulated slow connection (1Mbps) should not timeout prematurely.
- Failed uploads must clean up any partial files, temp files, or orphaned database records. The buggy code leaves orphaned files when database insert fails after file write. To verify: simulate a database failure during upload - no orphaned files should remain on disk.
- File type validation must inspect actual file content (magic bytes), not just trust the file extension or client-provided MIME type. The buggy code only checks file.mimetype which can be spoofed. To verify: rename a .exe file to .jpg and attempt upload - it should be rejected based on content inspection, not accepted based on extension

## Metadata
- Programming Languages: Javascript
- Frameworks: Express.js
- Libraries: Multer, sharp
- Databases: Postgress
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
