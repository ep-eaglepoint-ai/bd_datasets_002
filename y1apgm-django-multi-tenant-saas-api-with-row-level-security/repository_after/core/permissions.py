from rest_framework import permissions


class IsTenantMember(permissions.BasePermission):
    """
    Permission class that checks if request has a valid tenant context.
    This is required for all tenant-scoped endpoints.
    """
    def has_permission(self, request, view):
        # Allow if we have tenant context (either via JWT or API key)
        return hasattr(request, 'tenant') and request.tenant is not None


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission class for owner or admin roles.
    Required for managing users, API keys, and viewing audit logs.
    """
    def has_permission(self, request, view):
        # API key auth doesn't have membership, check for api_key
        if hasattr(request, 'api_key') and request.api_key:
            # API keys have full access to their org's data
            return True
        if not hasattr(request, 'membership') or not request.membership:
            return False
        return request.membership.role in ['owner', 'admin']


class IsOwner(permissions.BasePermission):
    """
    Permission class for owner role only.
    Required for organization settings like billing plan changes.
    """
    def has_permission(self, request, view):
        if not hasattr(request, 'membership') or not request.membership:
            return False
        return request.membership.role == 'owner'


class CanManageProjects(permissions.BasePermission):
    """
    Permission class for project management.
    - Owner and Admin can create, update, delete projects
    - Member and Viewer can only read projects
    """
    def has_permission(self, request, view):
        # API key auth has full access
        if hasattr(request, 'api_key') and request.api_key:
            return True
        if not hasattr(request, 'membership') or not request.membership:
            return False
        
        # Safe methods (GET, HEAD, OPTIONS) allowed for all authenticated members
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only owner and admin can create/update/delete projects
        return request.membership.role in ['owner', 'admin']


class CanManageTasks(permissions.BasePermission):
    """
    Permission class for task management.
    - Owner, Admin, and Member can create, update, delete tasks
    - Viewer can only read tasks
    """
    def has_permission(self, request, view):
        # API key auth has full access
        if hasattr(request, 'api_key') and request.api_key:
            return True
        if not hasattr(request, 'membership') or not request.membership:
            return False
        
        # Safe methods (GET, HEAD, OPTIONS) allowed for all authenticated members
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Owner, Admin, and Member can manage tasks
        return request.membership.role in ['owner', 'admin', 'member']


class IsViewer(permissions.BasePermission):
    """
    Permission class that allows viewers read-only access.
    Used in combination with other permissions.
    """
    def has_permission(self, request, view):
        # API key auth has full access (no viewer restrictions)
        if hasattr(request, 'api_key') and request.api_key:
            return True
        
        if not hasattr(request, 'membership') or not request.membership:
            return False
        
        # If viewer, only allow safe methods
        if request.membership.role == 'viewer':
            return request.method in permissions.SAFE_METHODS
        
        # Non-viewers pass this check (actual permission determined by other classes)
        return True


class CanManageOrganization(permissions.BasePermission):
    """
    Permission class for organization settings.
    Only owner can update organization name, plan, etc.
    """
    def has_permission(self, request, view):
        if not hasattr(request, 'membership') or not request.membership:
            return False
        
        # Safe methods allowed for all members who can see the org
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only owner can modify organization
        return request.membership.role == 'owner'
