"""URL patterns for document endpoints."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DocumentViewSet, 
    DocumentVersionListView, 
    DocumentVersionDetailView,
    DocumentRollbackView
)

router = DefaultRouter()
router.register('documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
    path(
        'documents/<int:document_id>/versions/', 
        DocumentVersionListView.as_view(), 
        name='document_versions'
    ),
    path(
        'documents/<int:document_id>/versions/<int:version_id>/', 
        DocumentVersionDetailView.as_view(), 
        name='document_version_detail'
    ),
    path(
        'documents/<int:document_id>/versions/<int:version_id>/rollback/', 
        DocumentRollbackView.as_view(), 
        name='document_rollback'
    ),
]
