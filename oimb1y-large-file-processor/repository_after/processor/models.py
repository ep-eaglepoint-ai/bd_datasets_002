import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _

class FileAsset(models.Model):
    class ProcessingStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        RUNNING = 'RUNNING', _('Running')
        SUCCEEDED = 'SUCCEEDED', _('Succeeded')
        FAILED = 'FAILED', _('Failed')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to='uploads/%Y/%m/%d/')
    original_filename = models.CharField(max_length=255)
    size = models.BigIntegerField()
    sha256_checksum = models.CharField(max_length=64, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    file_extension = models.CharField(max_length=50, blank=True)
    encoding = models.CharField(max_length=50, blank=True, null=True)
    
    # Metadata
    image_width = models.IntegerField(null=True, blank=True)
    image_height = models.IntegerField(null=True, blank=True)
    page_count = models.IntegerField(null=True, blank=True)
    duration = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    
    processing_status = models.CharField(
        max_length=20,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.PENDING,
    )
    error_message = models.TextField(blank=True, null=True)
    extra_attributes = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.original_filename
