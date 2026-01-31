# Trajectory: Task Manager API Refactor

This document outlines the engineering process followed to resolve critical production incidents in the Task Manager API.

## Analysis

The initial investigation into the production incidents revealed several fundamental architectural flaws:

1.  **Concurrency Vulnerabilities**: The use of global slices (`tasks`, `taskBuffer`) and maps (`shadowTasks`) without synchronization mechanisms (like `sync.Mutex`) led to frequent race conditions, crashes, and data corruption.
2.  **Weak Consistency Model**: Asynchronous updates through channels and background workers caused "Data Vanishing" and "Visible Latency" issues. Successful responses were sent before data was actually persisted.
3.  **Fragmented Storage**: Task data was scattered across three different structures (`tasks`, `taskBuffer`, `shadowTasks`), making it impossible to maintain a single source of truth and leading to duplicate records.
4.  **Inefficient Deletion**: The `deleteLog` approach only filtered results during read operations, leaving the actual data in memory and leading to OOM alerts.
5.  **Lack of Validation**: Absence of input sanitization allowed invalid or unrealistic data to contaminate the internal state.

## Strategy

The refactoring strategy focused on radical simplification and strict adherence to the API contract:

-   **Consolidated Storage**: Replaced the fragmented slice/buffer/map architecture with a single `map[string]Task`. This provides O(1) lookups and a single source of truth.
-   **Thread-Safety via RWMutex**: Implemented `sync.RWMutex` to ensure safe concurrent access. Using an `RWMutex` instead of a standard `Mutex` allows multiple concurrent readers, optimizing performance for the frequent `GET` operations.
-   **Synchronous Operations**: Removed all background goroutines, channels, and buffers. Every write operation (POST, PUT, DELETE) is now synchronous, ensuring immediate consistency and absolute reliability.
-   **Strict Schema Validation**: Introduced a centralized `validateTask` function to enforce data integrity rules (ID uniqueness, non-empty fields, status enumeration, and date bounds).
-   **Resource-Oriented Responses**: Updated the API to return the full state of the resource in all mutation responses, satisfying the requirements of mobile and frontend consumers.

## Execution

The refactor was executed in the following steps:

1.  **State Consolidation**: Defined the new `tasks` map and `sync.RWMutex`.
2.  **Removal of Async Logic**: Safely retired the `init()` background workers and the `updateChannel`/`processingQueue`.
3.  **Implementation of Validation**: Developed the `validateTask` logic based on the PRD specification.
4.  **Endpoint Refactoring**:
    -   `GET /tasks`: Simplified to iterate over the map under a Read-Lock.
    -   `POST /tasks`: Implemented duplicate ID checks and full object returns.
    -   `PUT /tasks/:id`: Refactored to perform synchronous updates while preserving unspecified fields.
    -   `DELETE /tasks/:id`: Implemented physical removal from the map using `delete()`.
5.  **Verification**: Validated the implementation against the Go race detector and ensured all production incidents (crashes, leaks, and integrity issues) were resolved.

## Resources

-   [Go Concurrency Patterns: Context](https://blog.golang.org/context)
-   [Gin Web Framework Documentation](https://gin-gonic.com/docs/)
-   [Effective Go: Maps](https://golang.org/doc/effective_go#maps)
-   [Go Memory Model](https://golang.org/ref/mem)
