from rest_framework import viewsets, mixins, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.http import StreamingHttpResponse, JsonResponse, HttpResponse
from .models import FileAsset
from .serializers import FileAssetSerializer
from .tasks import process_file_upload
import boto3

class FileAssetViewSet(mixins.CreateModelMixin,
                       mixins.RetrieveModelMixin,
                       viewsets.GenericViewSet):
    queryset = FileAsset.objects.all()
    serializer_class = FileAssetSerializer
    parser_classes = [parsers.MultiPartParser]

    def perform_create(self, serializer):
        instance = serializer.save()
        # Trigger async task immediately
        process_file_upload.delay(str(instance.id))

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        instance = self.get_object()
        return Response({'status': instance.processing_status})

    @action(detail=True, methods=['get'], url_path='download', url_name='download')
    def download(self, request, pk=None):
        instance = self.get_object()
        
        storage_backend = getattr(settings, 'STORAGE_BACKEND', 'local')
        
        if storage_backend == 's3':
            # Create presigned URL for S3
            try:
                s3_client = boto3.client(
                    's3', 
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID, 
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME,
                    endpoint_url=settings.AWS_S3_ENDPOINT_URL
                )
                url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': instance.file.name},
                    ExpiresIn=3600
                )
                
                return Response({'url': url}) 
            except Exception as e:
                # Fallback or error
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        else:
            # Secure streaming response for local storage
            try:
                file_handle = instance.file.open()
                response = StreamingHttpResponse(file_handle, content_type=instance.mime_type or 'application/octet-stream')
                response['Content-Disposition'] = f'attachment; filename="{instance.original_filename}"'
                return response
            except FileNotFoundError:
                 return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
