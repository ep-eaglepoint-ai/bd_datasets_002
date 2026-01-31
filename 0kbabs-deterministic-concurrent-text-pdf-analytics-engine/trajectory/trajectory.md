# 0KBABS - Trajectory

1. Audit the Requirements (Scope Definition)
   I audited the detailed requirements for the Text & PDF Analytics Engine from the README. The goal was to transform a flawed, non-deterministic legacy tool into a correct, safe, and efficient one. Key constraints included eliminating global variables, fixing specific race conditions (TOCTOU, loop capture), removing `unsafe` usage, ensuring O(N) linear time complexity with constant memory footprint (streaming), and implementing a robust PDF parser without external C-dependencies.

2. Define the Architecture and Constraints
   I selected a standard Go approach using the `sync` package for concurrency and `bufio` for efficient I/O. I strictly avoided external dependencies to keep the solution pure Go. I decided on a **Worker Pool pattern** for concurrent text processing and a **State Machine** approach for robust PDF parsing to handle edge cases like escaped characters and nested dictionaries safely.

3. Initialize the Refactoring
   I started by analyzing the `repository_before/main.go` to identify all violations. I then initialized the `repository_after` by completely rewriting the architecture, starting with the definition of an `Analyzer` struct to encapsulate state, satisfying the requirement to eliminate package-level global variables.

4. Implement Core Logic and Safety
   I implemented the `Analyzer` struct with a `sync.Mutex`-protected registry to solve the "Time-of-Check to Time-of-Use" (TOCTOU) race condition. I guaranteed memory safety by removing all `unsafe` pointer conversions and ensured garbage collection could track memory correctly. I also fixed the common Go loop variable capture bug by passing the line content explicitly to worker goroutines.

5. Implement Efficient Streaming I/O
   To satisfy the O(N) complexity and streaming requirement, I replaced the memory-hogging `readAllBroken` function with `bufio.Scanner`. This allows the engine to process files larger than available RAM by reading line-by-line (or byte-by-byte for PDF) with a constant memory footprint, preventing OOM crashes on large datasets.

6. Implement Robust PDF Parsing
   I discarded the fragile `bytes.Split("BT")` approach and implemented a proper **Byte-Stream State Machine**. This parser reads the PDF stream byte-by-byte, correctly handling "BT"..."ET" content blocks, ignoring nested dictionaries, and interpreting escaped characters (e.g., `\)`, `\\`) safely. This prevents panics and ensures correct text extraction without recursive stack risks.

7. Ensure Determinism
   I revamped the reporting logic to guarantee deterministic output. Instead of random map iteration order, I implemented a stable sort algorithm using `sort.SliceStable`: primary sort by count (descending) and secondary sort by word (lexicographically ascending). This ensures that running the tool multiple times on the same input produces bit-identical output.

8. Verify with Comprehensive Testing
   I established a verification suite in the `tests/` directory using Go's standard testing framework. I wrote 7 distinct integration tests (`isolation_test.go`, `concurrency_test.go`, `streaming_test.go`, `pdf_test.go`, `determinism_test.go`, `code_compliance_test.go`, `edge_cases_test.go`) to verify every single requirement. These tests confirmed the removal of globals, the absence of race conditions, memory safety, streaming capability, accurate PDF parsing, and output determinism.
