"""Views for Document and DocumentVersion."""
from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import Document, DocumentVersion
from .serializers import (
    DocumentSerializer,
    DocumentListSerializer,
    DocumentCreateSerializer,
    DocumentUpdateSerializer,
    DocumentVersionSerializer,
    DocumentVersionListSerializer,
)
from .permissions import IsOwner


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document CRUD operations.
    
    Supports:
    - list: List all documents for the current user
    - create: Create a new document (creates version 1)
    - retrieve: Get a single document
    - update/partial_update: Update a document (creates new version)
    - destroy: Delete a document
    """
    
    permission_classes = [IsAuthenticated, IsOwner]
    filterset_fields = ['title']
    search_fields = ['title']
    ordering_fields = ['updated_at', 'created_at', 'title']
    ordering = ['-updated_at']

    def get_queryset(self):
        """Return only documents owned by the current user."""
        return Document.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return DocumentListSerializer
        elif self.action == 'create':
            return DocumentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DocumentUpdateSerializer
        return DocumentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Document created successfully.',
            'data': DocumentSerializer(document).data
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Document updated successfully.',
            'data': DocumentSerializer(document).data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        
        return Response({
            'success': True,
            'message': 'Document deleted successfully.'
        }, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data = {
                'success': True,
                'data': response.data
            }
            return response
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'data': serializer.data
        })


class DocumentVersionListView(generics.ListAPIView):
    """List all versions for a document with pagination."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentVersionListSerializer

    def get_queryset(self):
        document_id = self.kwargs.get('document_id')
        document = get_object_or_404(
            Document, 
            id=document_id, 
            owner=self.request.user
        )
        return document.versions.all()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data = {
                'success': True,
                'data': response.data
            }
            return response
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })


class DocumentVersionDetailView(generics.RetrieveAPIView):
    """Retrieve a single version."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentVersionSerializer

    def get_object(self):
        document_id = self.kwargs.get('document_id')
        version_id = self.kwargs.get('version_id')
        
        document = get_object_or_404(
            Document, 
            id=document_id, 
            owner=self.request.user
        )
        return get_object_or_404(
            DocumentVersion, 
            id=version_id, 
            document=document
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'data': serializer.data
        })


class DocumentRollbackView(APIView):
    """Rollback a document to a specific version."""
    
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, document_id, version_id):
        """
        Rollback to a specific version.
        
        This restores the content from the specified version and
        creates a new version entry logging the rollback action.
        """
        # Get the document (verify ownership)
        document = get_object_or_404(
            Document, 
            id=document_id, 
            owner=request.user
        )
        
        # Get the target version
        target_version = get_object_or_404(
            DocumentVersion, 
            id=version_id, 
            document=document
        )
        
        # Restore content from the target version
        document.current_content = target_version.content_snapshot
        document.save()
        
        # Create a new version logging the rollback
        change_note = f"Rolled back to version {target_version.version_number}"
        new_version = document.create_version(request.user, change_note)
        
        return Response({
            'success': True,
            'message': f'Document rolled back to version {target_version.version_number}.',
            'data': {
                'document': DocumentSerializer(document).data,
                'new_version': DocumentVersionSerializer(new_version).data
            }
        })
