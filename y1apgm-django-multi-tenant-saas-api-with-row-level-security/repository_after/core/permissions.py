from rest_framework import permissions


class IsTenantMember(permissions.BasePermission):
    def has_permission(self, request, view):
        return hasattr(request, 'tenant') and request.tenant is not None


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if hasattr(request, 'api_key') and request.api_key:
            return True
        if not hasattr(request, 'membership') or not request.membership:
            return False
        return request.membership.role in ['owner', 'admin']


class IsOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        if not hasattr(request, 'membership') or not request.membership:
            return False
        return request.membership.role == 'owner'


class CanManageProjects(permissions.BasePermission):
    def has_permission(self, request, view):
        if hasattr(request, 'api_key') and request.api_key:
            return True
        if not hasattr(request, 'membership') or not request.membership:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.membership.role in ['owner', 'admin']


class CanManageTasks(permissions.BasePermission):
    def has_permission(self, request, view):
        if hasattr(request, 'api_key') and request.api_key:
            return True
        if not hasattr(request, 'membership') or not request.membership:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.membership.role in ['owner', 'admin', 'member']


class IsViewer(permissions.BasePermission):
    def has_permission(self, request, view):
        if hasattr(request, 'api_key') and request.api_key:
            return True
        if not hasattr(request, 'membership') or not request.membership:
            return False
        if request.membership.role == 'viewer':
            return request.method in permissions.SAFE_METHODS
        return True


class CanManageOrganization(permissions.BasePermission):
    def has_permission(self, request, view):
        if not hasattr(request, 'membership') or not request.membership:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.membership.role == 'owner'
