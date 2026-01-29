import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from processor.models import FileAsset
from processor.tasks import process_file_upload
from unittest.mock import patch

@pytest.mark.django_db
class TestFileProcessor:

    def test_upload_success(self, api_client, celery_always_eager):
        """Test successful file upload and processing."""
        file_content = b"Hello world"
        file = SimpleUploadedFile("test.txt", file_content, content_type="text/plain")
        
        response = api_client.post('/files/', {'file': file}, format='multipart')
        assert response.status_code == 201
        file_id = response.data['id']
        
        # Check that the asset was created
        asset = FileAsset.objects.get(id=file_id)
        assert asset.original_filename == "test.txt"
        assert asset.size == len(file_content)
        
        # Refetch to check async processing result (since eager)
        asset.refresh_from_db()
        assert asset.processing_status == "SUCCEEDED"
        assert asset.sha256_checksum is not None
        # magic might detect as text/plain
        assert "text/plain" in asset.mime_type
        
        # Test Status Endpoint
        status_resp = api_client.get(f'/files/{file_id}/status/')
        assert status_resp.status_code == 200
        assert status_resp.data['status'] == "SUCCEEDED"

    def test_oversized_file_rejection(self, api_client, settings):
        """Test that files larger than limit are rejected at upload time."""
        settings.MAX_UPLOAD_SIZE = 5  # Very small
        file_content = b"Hello world, I am too big"
        file = SimpleUploadedFile("big.txt", file_content, content_type="text/plain")
        
        response = api_client.post('/files/', {'file': file}, format='multipart')
        # DRF serializer validation error usually returns 400
        assert response.status_code == 400
        assert "size" in str(response.data) or "too large" in str(response.data)

    def test_disallowed_mime_rejection(self, api_client, celery_always_eager, settings):
        """Test that disallowed MIME types result in a FAILED status."""
        # Clean current allowed/blocked settings
        settings.ALLOWED_MIME_TYPES = ['image/png'] # Only allow png
        settings.BLOCKED_MIME_TYPES = [] # No explicit blocks, but allowed list implies block others
        
        file_content = b"Not a png"
        file = SimpleUploadedFile("fake.png", file_content, content_type="image/png")
        
        response = api_client.post('/files/', {'file': file}, format='multipart')
        assert response.status_code == 201
        
        file_id = response.data['id']
        asset = FileAsset.objects.get(id=file_id)
        asset.refresh_from_db()
        
        assert asset.processing_status == "FAILED"
        # Since it's text/plain really
        assert "MIME type" in asset.error_message

    def test_async_processing_failure_handling(self, api_client, celery_always_eager):
        """Test robust handling of processing errors."""
        # Create asset manually
        file_content = b"fail me"
        asset = FileAsset.objects.create(
            file=SimpleUploadedFile("fail.txt", file_content),
            original_filename="fail.txt",
            size=len(file_content)
        )
        
        # Patch magic to raise an exception
        with patch('magic.from_buffer', side_effect=Exception("Critical Failure")):
            process_file_upload(asset.id)
            
        asset.refresh_from_db()
        assert asset.processing_status == "FAILED"
        assert "Critical Failure" in asset.error_message
