# Trajectory (Thinking Process for Full-Stack Development)

**Project:** Logistics CSV Pipeline (Vue + C + MongoDB)

### 1. Audit the Requirements (Identify Constraints)

I audited the project requirements: the system needed to ingest large CSV files (potential for 10,000+ rows), validate strict schemas (tracking numbers, dimensions), and serve results with low latency.
**Constraint Identified:** Loading entire files into memory for parsing or validation would fail at scale. A streaming approach was necessary.

### 2. Define a System Contract First

I defined the API and Data contracts before writing code. The backend must support streaming uploads (`POST /api/upload`) and paginated reads (`GET /api/records`), ensuring the frontend (`ResultsTable.vue`) never receives more data than it can render.
_Learn about API Design-First:_ [Design First](https://swagger.io/resources/articles/adopting-an-api-design-first-approach/)

### 3. Design the Data Model for Efficiency

I designed a MongoDB schema optimized for write-heavy ingestion and read-heavy reporting.

- **Shipments Collection:** Stores valid records with indices on `batch_id` and `row_number` for fast retrieval.
- **Errors Collection:** Segregates validation failures to keep the main table clean and performant.
- **Batches Collection:** Tracks state (`UPLOADING`, `PARSING`, `COMPLETE`) to separate progress metadata from row data.

### 4. Implement Streaming Ingestion (Projection-First Input)

Instead of a "Load-Then-Process" model, I built a custom C parser (`parser.c`) that streams the input chunk-by-chunk. It effectively "projects" raw bytes into structured `ShipmentRecord` structs on the fly, minimizing memory footprint (`O(1)` memory usage relative to file size).

### 5. Move Validation Logic to the Stream (Server-Side)

I integrated validation (`validator.c`) directly into the parsing stream.

- **Immediate Feedback:** Invalid rows are detected instantly.
- **No Stale Data:** Filters (e.g., status checks, dimension limits) apply before the data even hits the database.

### 6. Use Bulk Operations Instead of Iterative Inserts

To prevent the "N+1 Inserts" problem, I implemented batch flushing in `server.c`.

- **Strategy:** Accumulate 500 records in memory -> `mongoc_bulk_operation_insert` -> Clear buffer.
- **Result:** Reduces database round-trips by 500x, significantly speeding up ingestion.

### 7. Stable Pagination Implementation

I implemented stable server-side pagination in `db.c` using standard MongoDB `skip`/`limit`.

- **Frontend Contract:** The Vue component requests specific pages (`skip = (page-1) * limit`).
- **Backend Optimization:** Queries only fetch the requested 50 slice, ensuring the API remains responsive regardless of total dataset size.

### 8. Eliminate N+1 Queries for Progress Tracking

Instead of polling the count of inserted rows (which would require expensive `count_documents` scans repeatedly), I maintained a dedicated `BatchProgress` counter in memory and flushed it to the `batches` collection periodically. The frontend polls this single document (`GET /api/status/:id`) for real-time updates.

### 9. Normalize Data for Consistency

Added normalization in `parser.c` (`trim_whitespace`). Field values like `status` and `ship_date` are standardized during ingestion, ensuring that " DELIVERED " and "DELIVERED" are treated identically in search and storage.

### 10. Result: Measurable Performance Gains + Responsive UX

The solution delivers a high-performance pipeline:

- **Zero Memory Bloat:** Streams files of any size.
- **Fast Ingestion:** Bulk inserts maximize write throughput.
- **Instant UI:** Paginated, filtered results load immediately.
- **Predictable Behavior:** Validates 100% of data against the schema.

---

### Trajectory Transferability Notes

This trajectory follows the core "Audit → Contract → Design → Execute → Verify" structure, adapted for a **Greenfield Full-Stack Implementation**:

- **Audit:** Focused on scalability constraints (Memory/CPU) rather than legacy code debt.
- **Contract:** Defined API endpoints and Schema rather than refactoring performance goals.
- **Execution:** Focused on building efficient pipelines (Streaming, Bulk) rather than refactoring loops.
- **Verification:** Ensured through Integration Tests (`docker compose run test`) and End-to-End Evaluation.
