# Trajectory (Thinking Process for Refactoring PdfMerger)

## 1. Audit the Original Code (Identify Integrity & Memory Problems)
I audited the original code. It used simple buffer concatenation for PDF files, which corrupted the internal binary structure (%PDF header, cross-reference tables). It also stored all processed buffers in an unbounded in-memory array (`tempStorage`), guaranteeing meaningful memory leaks.

## 2. Define a Stability Contract First
I defined the constraints: operations must be binary-safe using a parser (`pdf-lib`), the service must operate within 256MB RAM (requiring strict reference cleanup), and I/O must be non-blocking to prevent event loop starvation.

## 3. Rework the Data Handling for Integrity
I introduced `pdf-lib` to handle the complexity of PDF binary structures. Instead of raw concatenation, we now load documents into an Object Model (`PDFDocument`) which manages the Cross-Reference Table (XRef) and Trailer reconstruction automatically.

## 4. Enforce Memory Boundaries
I implemented strict scoping for buffer variables. Large buffers are processed and then allowed to be garbage collected. The `tempStorage` array was removed entirely as it served no functional purpose other than leaking memory.

## 5. Implement Page Extraction Logic
I added a parsing layer for page ranges ("1-5, 8"). This logic translates user-friendly strings into 0-based array indices, allowing for precise page copying between documents without loading unnecessary data.

## 6. Implement Layer-Based Watermarking
Instead of modifying binary streams directly (which is error-prone), I utilized the `drawText` API of `pdf-lib` to inject watermarks as a graphical layer on top of existing pages, respecting the coordinate system and rotation requirements (45 degrees).

## 7. Verify Output Integrity
I established a verification step that checks not just for the absence of errors, but for valid page counts and readable PDF headers in the output.

## 8. Result: Safe, Efficient Service
The solution now handles binary PDFs correctly, stays within memory limits even under load, and provides the requested feature set (ranges, watermarks) without corruption.
