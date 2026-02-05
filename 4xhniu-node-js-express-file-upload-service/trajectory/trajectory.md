# Trajectory

## Trajectory (Thinking Process for Refactoring)

### 1. Audit the Original Code (Identify Scaling Problems)

I audited the original logic described in the problem statement. It buffered entire files into memory strings before writing, calculated hashes post-upload (reading the file twice), and used synchronous database writes blocking the main thread. It also lacked concurrency limits, causing process crashes under load.

### 2. Define a Performance Contract First

I defined performance conditions:

- **Memory**: Must stay under 50MB regardless of file size (Stream processing).
- **Concurrency**: Hard limit of 10 active uploads; reject excess with 503.
- **Latency**: No blocking on DB writes (Async metadata).
- **Safety**: Reject invalid file types immediately (Head peeking).

### 3. Rework the Data Model for Efficiency

I switched from a "load-then-process" model to a "stream-pipeline" model.
Instead of loading the `Payload` object, the data flows through `io.Reader` chains.

- `MultipartReader` -> `LimitReader` (Size Limit) -> `TeeReader` (Checksum) -> `io.Writer` (File).

### 4. Rebuild the Upload as a Streaming Pipeline

The pipeline now processes bytes as they arrive.

- **Old**: `req.on('data', chunk => buffer += chunk)` -> `fs.writeFileSync(buffer)`
- **New**: `io.Copy(io.MultiWriter(file, hasher), limitReader)`
  This ensures expensive memory verification never happens.

### 5. Move Validation to the Edge (Stream Head)

All validation (Magic Numbers for file type) happens on the first 512 bytes.
If invalid, the stream is aborted immediately (HTTP 415), saving bandwidth and processing power.

### 6. Use Chunked Writes Instead of Full Buffers

File writing uses `io.Copy` which handles buffering internally (default 32KB chunks), preventing the "blocking event loop" issue seen in `fs.writeFileSync` for large files.
I also integrated **In-Memory Progress Tracking** (Req 9) here by wrapping the reader, avoiding database writes for intermediate progress.

### 7. Stable Storage + Directory Distribution

I implemented a date-based directory structure (`uploads/YYYY/MM/DD/`) to prevent file system degradation from having thousands of files in a single flat directory.
I also added **Cleanup Logic** (Req 10) to remove incomplete files from failed streams to prevent orphan accumulation.

### 8. Eliminate Connection Overhead

I eliminated the "one connection per request" anti-pattern by implementing a shared `sql.DB` connection pool (`SetMaxOpenConns(25)`). This prevents "too many open files" errors and reduces handshake latency.

### 9. Optimize Metadata Storage (Async)

Metadata insertion is moved to a background goroutine (`go SaveMetadataAsync`), decoupling the client success response from the database write latency.

### 10. Result: Measurable Performance Gains + Predictable Signals

The solution consistently handles 100MB+ files with negligible memory footprint, strictly enforces concurrency limits to protect the server, and provides immediate feedback on invalid requests.

## Trajectory Transferability Notes

The above trajectory is designed for **Performance Optimization & Refactoring**. The steps outlined in it represent reusable thinking nodes (audit, contract definition, structural changes, execution, and verification).

### Refactoring → Full-Stack Development

● Audit: Identify bottlenecks in request lifecycle.
● Contract: Define memory and latency budgets per endpoint.
● Structural: Switch from in-memory processing to streaming/async pipelines.

### Refactoring → Code Generation

● Audit: Analyze requirements (e.g., "stream files", "validate early").
● Contract: Generate constraints (e.g., `MaxFileSize`, `MaxConcurrent`).
● Execution: Scaffolding robust patterns (Middleware, Workers) rather than simple naive scripts.

## Core Principle (Applies to All)

● Audit → Contract → Design → Execute → Verify remains constant.
