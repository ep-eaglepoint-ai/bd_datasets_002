# Large File Processor Implementation

## Overview

This is a production-ready Django-based large file processor that supports:
- Streaming file uploads (no memory exhaustion)
- Asynchronous processing with Celery
- Content-based file validation
- Metadata extraction
- Configurable storage backends (Local/S3)
- Comprehensive security features

## Architecture

### Components

1. **Django REST Framework API** (`processor/views.py`)
   - `POST /files/` - Upload files
   - `GET /files/{id}/` - Get file metadata
   - `GET /files/{id}/status/` - Check processing status
   - `GET /files/{id}/download/` - Download file (signed URL for S3, streaming for local)

2. **FileAsset Model** (`processor/models.py`)
   - Stores file metadata and processing status
   - UUID primary key
   - Tracks: filename, size, checksum, MIME type, dimensions, duration, etc.

3. **Celery Tasks** (`processor/tasks.py`)
   - Asynchronous file processing
   - SHA-256 checksum calculation (streaming)
   - MIME type detection (content-based using libmagic)
   - Metadata extraction (images, PDFs, etc.)
   - MIME validation
   - Virus scan hook

4. **Storage Backends**
   - Local filesystem (default)
   - S3-compatible object storage (configurable)

## Configuration

All configuration is via environment variables:

### Required
- `DJANGO_SETTINGS_MODULE=config.settings`
- `SECRET_KEY` - Django secret key

### Celery
- `CELERY_BROKER_URL` - Redis URL (default: redis://redis:6379/0)
- `CELERY_RESULT_BACKEND` - Redis URL (default: redis://redis:6379/0)
- `CELERY_TASK_ALWAYS_EAGER` - Run tasks synchronously for testing (default: False)

### Storage
- `STORAGE_BACKEND` - 'local' or 's3' (default: local)
- `MEDIA_ROOT` - Local storage path (default: /app/media)
- `MEDIA_URL` - Media URL prefix (default: /media/)

### S3 (when STORAGE_BACKEND=s3)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_STORAGE_BUCKET_NAME`
- `AWS_S3_REGION_NAME`
- `AWS_S3_ENDPOINT_URL` (optional)

### File Validation
- `MAX_UPLOAD_SIZE` - Maximum file size in bytes (default: 100MB)
- `ALLOWED_MIME_TYPES` - Comma-separated list (default: *)
- `BLOCKED_MIME_TYPES` - Comma-separated list (default: empty)

## Running with Docker

### Build and run tests:
```bash
docker compose build
docker compose run --rm -e PYTHONPATH=/app/repository_after app pytest -q
```

### Run the full stack:
```bash
docker compose up
```

This starts:
- Django app (with migrations)
- Celery worker
- Redis

## Running Locally

### Setup:
```bash
cd repository_after
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Run migrations:
```bash
python manage.py migrate
```

### Start Redis (required for Celery):
```bash
docker run -p 6379:6379 redis:7-alpine
```

### Start Celery worker:
```bash
celery -A config worker --loglevel=info
```

### Start Django dev server:
```bash
python manage.py runserver
```

### Run tests:
```bash
pytest -q
```

## API Usage Examples

### Upload a file:
```bash
curl -X POST http://localhost:8000/files/ \
  -F "file=@/path/to/file.pdf"
```

Response:
```json
{
  "id": "uuid-here",
  "original_filename": "file.pdf",
  "size": 12345,
  "status": "PENDING",
  "created_at": "2026-01-27T...",
  ...
}
```

### Check status:
```bash
curl http://localhost:8000/files/{id}/status/
```

### Get metadata:
```bash
curl http://localhost:8000/files/{id}/
```

### Download:
```bash
curl http://localhost:8000/files/{id}/download/
```

## Security Features

1. **File Size Limits** - Enforced at upload time
2. **MIME Type Validation** - Content-based detection, not extension-based
3. **Virus Scan Hook** - Ready for integration with ClamAV or similar
4. **No Path Exposure** - Internal paths never exposed to clients
5. **Streaming Uploads** - No memory exhaustion attacks
6. **Signed URLs** - For S3 downloads (time-limited)

## Testing

The test suite covers:
- Successful upload and processing
- Oversized file rejection
- Disallowed MIME type rejection
- Async processing failure handling

Run tests:
```bash
pytest -v tests/
```

## Project Structure

```
repository_after/
├── config/              # Django project settings
│   ├── __init__.py
│   ├── settings.py      # Main configuration
│   ├── urls.py          # URL routing
│   ├── wsgi.py          # WSGI application
│   └── celery.py        # Celery configuration
├── processor/           # Main app
│   ├── migrations/      # Database migrations
│   ├── __init__.py
│   ├── admin.py         # Django admin
│   ├── apps.py          # App configuration
│   ├── models.py        # FileAsset model
│   ├── serializers.py   # DRF serializers
│   ├── views.py         # API views
│   ├── tasks.py         # Celery tasks
│   └── urls.py          # App URLs
├── manage.py            # Django management
└── requirements.txt     # Python dependencies
```

## Dependencies

- Django 4.2+
- Django REST Framework
- Celery
- Redis
- python-magic (libmagic)
- boto3 (for S3)
- django-storages
- Pillow (image processing)
- PyPDF2 (PDF processing)

## Development Notes

- All file processing happens asynchronously to keep the API responsive
- SHA-256 checksums are calculated by streaming chunks (no memory issues)
- MIME detection uses libmagic for accurate content-based detection
- The system is designed to be extended with additional metadata extractors
- Virus scanning is a placeholder hook ready for real implementation

## Future Enhancements

- Resumable uploads (TUS protocol)
- Real virus scanning (ClamAV integration)
- Thumbnail generation
- S3 direct upload (pre-signed POST URLs)
- Video transcoding
- OCR for images/PDFs
- Duplicate detection (by checksum)
