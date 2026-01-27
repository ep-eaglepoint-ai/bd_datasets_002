# Trajectory

1. Identify the upload failure mode and adopt chunking
	I confirmed the single-request upload was brittle over unstable networks and planned a resumable chunking protocol with handshake and per-chunk state tracking. This aligns with common large-file upload patterns. Reference: https://medium.com/@yogeshkrishnanseeniraj/handling-large-file-uploads-up-to-10gb-in-django-a-complete-guide-efa195d80445

2. Use Django’s recommended file upload handling
	I aligned server-side ingestion with Django’s upload handling conventions to avoid memory pressure and ensure streaming chunk writes. Reference: https://docs.djangoproject.com/en/6.0/ref/files/uploads/

3. Implement resumable handshake and missing-chunk detection
	I added a handshake flow to allow resume by returning missing chunk indices based on the server’s chunk map, enabling idempotent retries. Guidance on chunking and resumable patterns: https://transloadit.com/devtips/optimizing-online-file-uploads-with-chunking-and-parallel-uploads/

4. Validate chunk size and order to protect integrity
	I enforced expected chunk sizes and index bounds, ensuring out-of-order or malformed chunks don’t corrupt the session state. This prevents partial or invalid assembly.

5. Ensure atomic reassembly with locking
	I added an atomic reassembly step using a lock file and temporary output before final replace, preventing race conditions under concurrent uploads. Discussion on threading and uploads: https://stackoverflow.com/questions/52812324/are-there-any-advantages-of-using-multiple-threads-for-a-file-upload

6. Provide a frontend upload manager with progress
	I built a lightweight JS upload manager using File.slice() with progress reporting and handshake-based resume. Overview: https://youtu.be/Nll4pKmJBO0?si=3QNiJuQoGKzxozfd

