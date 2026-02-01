# Trajectory: Semantic Search Index Builder Implementation

## 1. Requirements Analysis & Scope
The objective was to create a robust, stand-alone command-line tool capable of transforming raw text documents into a searchable semantic vector index.
*   **Core Needs:** Parse JSONL data, generate semantic embeddings, build an efficient similarity index, and persist everything for later retrieval.
*   **Constraints:** Strict adherence to data integrity (input validation), reproducible environment (Docker), and compatibility with standard vector search operations (Cosine Similarity).

## 2. Core Architecture & Pipeline Design
*   **Goal:** A linear, verifiable data processing pipeline.
*   **Strategy:** I designed a three-stage pipeline: **Load & Validate** -> **Embed & Normalize** -> **Index & Persist**.
*   **Decision:** I chose an in-memory approach for the initial implementation. While streaming is powerful for massive datasets, loading records into memory simplifies the batch processing required for efficient embedding generation on GPUs/CPUs and ensures atomic integrity—if the process fails, we don't end up with a corrupt partial index.

## 3. Data Integrity & Validation Schema
*   **Goal:** Fail fast on bad input rather than producing a "silent failure" index.
*   **Strategy:** I implemented strict field validation before any heavy ML processing begins.
*   **Reasoning:** Determining that a record is missing the required "text" field or contains malformed JSON halfway through a 3-hour embedding job is unacceptable. By validating structure early, we ensure that if the process runs, the output is guaranteed to be valid and complete. We intentionally differentiate between "empty lines" (skippable) and "malformed records" (fatal errors) to balance robustness with strictness.

## 4. Embedding & Similarity Logic
*   **Goal:** Enable Cosine Similarity search using standard Indexing structures.
*   **Challenge:** The chosen indexing library (FAISS) is highly optimized for Inner Product (IP) and Euclidean (L2) distances, but Cosine Similarity is often the preferred metric for semantic text search.
*   **Solution (Normalization):** I implemented L2 normalization on all vectors immediately after generation.
*   **Reasoning:** Mathematically, the Dot Product (Inner Product) of two normalized vectors is identical to their Cosine Similarity. This allows us to use the efficient `IndexFlatIP` (exact inner product search) while achieving the semantic relevance quality of Cosine Similarity, without needing specialized or slower metric kernels.

## 5. Metadata Synchronization
*   **Goal:** Retrieve the original human-readable content given a vector search match.
*   **Strategy:** I relied on **Implicit Positional Mapping**.
*   **Decision:** The FAISS index stores vectors at specific integer IDs (0, 1, 2...). I decided to store the metadata in a separate JSONL file where line N corresponds exactly to ID N in the index.
*   **Why?** This avoids the complexity and storage overhead of managing a separate ID-to-Record database or dictionary. As long as the write order is deterministic (guaranteed by the linear pipeline), this O(1) file-seek retrieval is extremely efficient and simple to maintain.

## 6. Configuration & Usability
*   **Goal:** Flexible execution options for local dev, CI/CD, and production Docker environments.
*   **Strategy:** I implemented a cascading configuration hierarchy: **CLI Arguments** > **Environment Variables** > **Hardcoded Defaults**.
*   **Reasoning:** This allows interactive users to override settings easily via flags, while Docker containers and deployment scripts can control behavior via environment variables without changing the command structure.

## 7. Output Management
*   **Goal:** Developer friction reduction.
*   **Solution:** Automatic directory hierarchy creation.
*   **Reasoning:** Tools that fail because an output folder doesn't exist are frustrating. By programmatically detecting and creating missing parent directories for the output paths, the tool becomes much friendlier to use in CI pipelines and scripts where creating nested directories beforehand is often rote boilerplate.
