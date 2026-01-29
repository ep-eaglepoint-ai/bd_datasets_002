from django.contrib import admin
from .models import FileAsset

@admin.register(FileAsset)
class FileAssetAdmin(admin.ModelAdmin):
    list_display = ['id', 'original_filename', 'size', 'mime_type', 'processing_status', 'created_at']
    list_filter = ['processing_status', 'mime_type', 'created_at']
    search_fields = ['original_filename', 'sha256_checksum']
    readonly_fields = ['id', 'sha256_checksum', 'created_at', 'modified_at']
