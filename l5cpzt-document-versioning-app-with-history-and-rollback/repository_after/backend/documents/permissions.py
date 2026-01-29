"""Custom permissions for documents."""
from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of a document to access it.
    """

    def has_object_permission(self, request, view, obj):
        # Handle both Document and DocumentVersion objects
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        elif hasattr(obj, 'document'):
            return obj.document.owner == request.user
        return False
