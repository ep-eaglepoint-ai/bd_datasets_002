from rest_framework import serializers
from .models import FileAsset
from django.urls import reverse
from django.conf import settings


class FileAssetSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source='processing_status', read_only=True)
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = FileAsset
        fields = [
            'id', 'file', 'original_filename', 'size', 'sha256_checksum', 
            'mime_type', 'file_extension', 'encoding', 
            'image_width', 'image_height', 'page_count', 'duration',
            'created_at', 'modified_at', 'status', 'error_message', 'extra_attributes',
            'download_url'
        ]
        read_only_fields = [
            'id', 'original_filename', 'size', 'sha256_checksum', 
            'mime_type', 'file_extension', 'encoding', 
            'image_width', 'image_height', 'page_count', 'duration',
            'created_at', 'modified_at', 'status', 'error_message', 'extra_attributes',
            'download_url'
        ]
        extra_kwargs = {
            'file': {'write_only': True} 
        }

    def get_download_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(reverse('file-download', args=[obj.id]))
        return None

    def validate_file(self, value):
        # Check size
        max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 10 * 1024 * 1024)
        if value.size > max_size:
            raise serializers.ValidationError(f"File size too large. Max size is {max_size} bytes.")
        return value

    def create(self, validated_data):

        file_obj = validated_data['file']
        # We manually populate basic metadata here, deeper analysis is async
        instance = FileAsset.objects.create(
            file=file_obj,
            original_filename=file_obj.name,
            size=file_obj.size
        )
        return instance
