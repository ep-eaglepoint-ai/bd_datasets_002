# Trajectory

1.  **Design the Journal Engine**
    Designed the `JournalEngine` struct to manage an `os.File` handle and a `sync.Mutex` for thread safety. Defined the binary record format (Checksum, Type, Length, Payload) to ensure strict data integrity.

2.  **Implement Append with Binary Framing**
    Implemented the `Append` method to serialize records into the defined binary format. Used `encoding/binary` (Big Endian) for header fields and `hash/crc32` to compute the checksum over the entire frame (excluding the checksum field itself). Ensured atomic writes to the in-memory buffer before flushing to the OS.

3.  **Implement Crash Recovery and Torn Write Handling**
    Developed the `recover` method, which is called upon initialization. This method scans the log file from the beginning, validating each record's checksum and length. If a corrupted header or payload is detected (indicating a torn write or disk corruption), the file is truncated to the last valid offset, ensuring a clean state for subsequent writes.

4.  **Implement Durability and Iteration**
    Added the `Sync` method to force physical disk writes using `fsync`. Implemented an `Iterator` to allow sequential replay of valid records, which is essential for restoring the system state after a restart.

5.  **Verify with Comprehensive Tests**
    Created a test suite covering:
    *   **Basic Functionality**: Writing and reading valid records.
    *   **Concurrency**: Multiple goroutines appending simultaneously.
    *   **Crash Recovery**: Simulating torn headers, partial payloads, and bit-rot to verify the truncation logic.
    *   **Performance**: Handling large payloads efficiently.

6.  **Result: Robust WAL Implementation**
    The final implementation provides a high-throughput, thread-safe, and crash-resilient Write-Ahead Log suitable for financial auditing systems.
