# Trajectory: Robust Node.js File Upload Service Refactoring

## 1. Bottleneck Analysis (The "Before" State)
I reviewed the legacy implementation and identified the following critical resiliency and performance inhibitors:
* **Event Loop Blocking:** Synchronous I/O (`readFileSync`, `writeFileSync`) and CPU-intensive image resizing on the main thread froze the server.
* **Memory Exhaustion:** Loading entire files into RAM using `multer.memoryStorage()` caused heap crashes ("JavaScript heap out of memory") with large concurrent uploads.
* **Resource Leakage:** Creating a new database `Client()` per request without pooling quickly exhausted the PostgreSQL connection limit.
* **Data Corruption:** Non-atomic file writes directly to the destination folder left corrupted partial files during crashes.
* **Race Conditions:** Utilizing `originalName` for storage caused file overwrites when users uploaded documents with identical names.

## 2. Streaming Architecture & Memory Efficiency
* **Goal:** Achieve constant $O(1)$ memory usage regardless of file size.
* **Strategy:** I transitioned from buffering to streaming interfaces.
* **Implementation:** 
    * **Uploads:** configured `Multer` to use the `diskStorage` engine, streaming data directly to disk.
    * **Downloads:** Replaced `fs.readFile` (slurping) with `fs.createReadStream().pipe(res)`.
* **Reasoning:** Buffering a 100MB file consumes ~100MB of heap. Streaming processes data in small 64KB chunks, keeping memory footprint minimal and stable under load.

## 3. Asynchronous Offloading & CPU Management
* **Goal:** Prevent CPU-bound tasks from blocking the Node.js Event Loop.
* **Strategy:** I offloaded image processing to dedicated Worker Threads.
* **Implementation:** 
    * Created a `thumbnailWorker.js` to handle `sharp` resizing operations.
    * Adopted a "fire-and-forget" pattern where the HTTP response returns immediately (`thumbnailStatus: 'generating'`), while the worker processes the image in the background.
* **Result:** The main thread remains free to handle incoming HTTP requests (Health checks, new uploads) even while processing high-resolution images, eliminating `504 Gateway Timeout` errors.

## 4. Resource Pooling & Reliability
* **Goal:** Ensure stability under high concurrency (100+ requests).
* **Strategy (Database):** I implemented `pg.Pool` to reuse connections.
    * **Logic:** Instead of the expensive handshake of establishing a new connection for every query ($O(n)$ overhead), the pool maintains a set of ready-to-use connections.
* **Strategy (Disk):** I integrated `fs.statfs` based pre-flight checks.
    * **Logic:** Before accepting an upload stream, the service verifies available disk space to fail fast (400 Bad Request) rather than crashing mid-write.

## 5. Data Integrity & Security Normalization
* **Goal:** Guarantee file integrity and system security.
* **Atomic Writes:** 
    * **Mechanism:** Uploads are streamed to a `temp/` directory first. Only after successful completion and validation are they moved via `fs.rename` (atomic operation) to the final `uploads/` directory.
    * **Outcome:** Zero partial files in the permanent storage, even if the server crashes.
* **Validation:** 
    * **Magic Bytes:** I implemented content inspection (reading the first 8 bytes) to verify MIME types against file signatures (e.g., `0xFF 0xD8` for JPEG) rather than trusting client-provided extensions.
* **Identity:** 
    * **Sanitization:** Replaced unsafe user-provided filenames with system-generated `UUID v4` tokens to prevent collisions and directory traversal attacks.
