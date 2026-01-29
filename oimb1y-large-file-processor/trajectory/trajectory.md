# Trajectory: Large File Processor

### 1. Phase 1: AUDIT / REQUIREMENTS ANALYSIS
**Guiding Question**: "How can we handle multi-gigabyte files in Django without crashing the server or compromising security?"

**Context**: Standard Django `request.FILES` handling can be memory-intensive. We need a streaming approach coupled with content-based (not extension-based) validation.

**Steps Taken**:
- Audited Django's `TemporaryFileUploadHandler` vs `MemoryFileUploadHandler`.
- Identified `libmagic` as the robust choice for MIME detection.
- Decided on an asynchronous architecture using Celery to offload heavy metadata extraction.
- Learn more about Django file uploads: [Django Upload Docs](https://docs.djangoproject.com/en/5.0/ref/files/uploads/)

---

### 2. Phase 2: DATA MODELING & STORAGE ABSTRACTION
**Guiding Question**: "How do we store files and metadata so they are both secure and scalable?"

**Steps Taken**:
- Created `FileAsset` model with UUID primary keys to prevent ID guessing.
- Implemented `django-storages` to allow seamless switching between Local and S3 backends.
- Metadata is stored in a structured way (dedicated fields for common types like Image/PDF) and a flexible `extra_attributes` JSON field.
- Strategy for secure downloads: Signed URLs for S3 and Streaming for Local.

---

### 3. Phase 3: STREAMING VALIDATION PIPELINE
**Guiding Question**: "How do we validate files safely in a background worker?"

**Steps Taken**:
- Implemented a Celery task that reads files in 4KB chunks for checksumming and MIME detection.
- Integrated `python-magic` for content-based validation.
- Added specialized metadata extractors for Images (Pillow), PDFs (PyPDF2), and Audio/Video (Mutagen).
- Created a virus scan hook interface for future ClamAV integration.
- Check out OWASP File Upload Best Practices: [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

---

### 4. Phase 4: API & TESTING
**Guiding Question**: "Is the system easy to use and resilient to adversarial inputs?"

**Steps Taken**:
- Built DRF ViewSets with dedicated `/status` and `/download` actions.
- Enforced strict `MAX_UPLOAD_SIZE` at the serializer level for early rejection.
- Developed a comprehensive test suite covering oversized files, disallowed MIME types, and processing failure recovery.
- Standardized the evaluation framework using `pytest-json-report` to match premium repository standards.

**When to revisit**: If resumable uploads (TUS protocol) are required for extremely unstable network conditions, or if real-time progress bars (WebSockets) are needed for the UI.
