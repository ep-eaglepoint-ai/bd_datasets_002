from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Organization, User, OrganizationMembership, Project, Task, APIKey, AuditLog
from .serializers import (
    OrganizationSerializer,
    UserSerializer,
    OrganizationMembershipSerializer,
    ProjectSerializer,
    TaskSerializer,
    APIKeySerializer,
    AuditLogSerializer,
)
from .permissions import (
    IsTenantMember, IsOwnerOrAdmin, CanManageProjects, 
    CanManageTasks, IsViewer, CanManageOrganization
)


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organizations.
    Only owners can update organization settings (name, plan).
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated, CanManageOrganization]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Organization.objects.filter(
                memberships__user=self.request.user,
                is_deleted=False
            ).distinct()
        return Organization.objects.none()

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """List all members in the organization."""
        organization = self.get_object()
        memberships = OrganizationMembership.objects.filter(
            organization=organization
        ).select_related('user')
        serializer = OrganizationMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsOwnerOrAdmin])
    def invite_member(self, request, pk=None):
        """Invite a new member to the organization (Admin/Owner only)."""
        organization = self.get_object()
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'member')
        
        if role not in ['admin', 'member', 'viewer']:
            return Response(
                {'error': 'Invalid role. Must be admin, member, or viewer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        membership, created = OrganizationMembership.objects.get_or_create(
            user=user,
            organization=organization,
            defaults={'role': role}
        )
        
        if not created:
            return Response(
                {'error': 'User is already a member of this organization'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = OrganizationMembershipSerializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users within an organization.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, IsViewer]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email', 'name']
    ordering_fields = ['name', 'email', 'created_at']

    def get_queryset(self):
        if hasattr(self.request, 'tenant') and self.request.tenant:
            return User.objects.filter(
                memberships__organization=self.request.tenant
            ).select_related().prefetch_related('memberships').distinct()
        return User.objects.none()

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing projects.
    - Owner/Admin can create, update, delete
    - Member/Viewer can read only
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, CanManageProjects, IsViewer]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'owner']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'status', 'created_at', 'updated_at']

    def get_queryset(self):
        # Use select_related to prevent N+1 queries
        return Project.objects.all().select_related('owner', 'organization').prefetch_related('tasks')

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.soft_delete()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTenantMember, IsOwnerOrAdmin])
    def restore(self, request, pk=None):
        """Restore a soft-deleted project (Admin/Owner only)."""
        try:
            # Use all_objects to find deleted projects, but must still be scoped to tenant
            project = Project.all_objects.filter(organization=request.tenant).get(pk=pk)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not project.is_deleted:
            return Response(
                {'error': 'Project is not deleted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        project.restore()
        serializer = self.get_serializer(project)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsTenantMember, IsOwnerOrAdmin])
    def deleted(self, request):
        """List all soft-deleted projects (Admin/Owner only)."""
        queryset = Project.all_objects.filter(
            organization=request.tenant,
            is_deleted=True
        ).select_related('owner', 'organization')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tasks.
    - Owner/Admin/Member can create, update, delete
    - Viewer can read only
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, CanManageTasks, IsViewer]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'project', 'assignee']
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'status', 'priority', 'due_date', 'created_at']

    def get_queryset(self):
        # Use select_related to prevent N+1 queries
        return Task.objects.all().select_related('project', 'assignee', 'organization')

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.soft_delete()

    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """Get tasks assigned to current user."""
        queryset = self.get_queryset().filter(assignee=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTenantMember, IsOwnerOrAdmin])
    def restore(self, request, pk=None):
        """Restore a soft-deleted task (Admin/Owner only)."""
        try:
            task = Task.all_objects.filter(organization=request.tenant).get(pk=pk)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not task.is_deleted:
            return Response(
                {'error': 'Task is not deleted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        task.restore()
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsTenantMember, IsOwnerOrAdmin])
    def deleted(self, request):
        """List all soft-deleted tasks (Admin/Owner only)."""
        queryset = Task.all_objects.filter(
            organization=request.tenant,
            is_deleted=True
        ).select_related('project', 'assignee', 'organization')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class APIKeyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing API keys.
    Only Owner/Admin can manage API keys.
    """
    serializer_class = APIKeySerializer
    permission_classes = [IsAuthenticated, IsTenantMember, IsOwnerOrAdmin]
    http_method_names = ['get', 'post', 'delete']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at', 'last_used_at']

    def get_queryset(self):
        if hasattr(self.request, 'tenant') and self.request.tenant:
            return APIKey.objects.filter(
                organization=self.request.tenant
            ).select_related('organization', 'created_by')
        return APIKey.objects.none()

    def create(self, request, *args, **kwargs):
        """Create a new API key and return the raw key (only shown once)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw_key = APIKey.generate_key()
        api_key = APIKey(
            name=serializer.validated_data['name'],
            organization=request.tenant,
            created_by=request.user,
        )
        api_key.set_key(raw_key)
        api_key.save()

        response_data = APIKeySerializer(api_key).data
        response_data['key'] = raw_key
        response_data['warning'] = 'Save this key - it will not be shown again!'

        return Response(response_data, status=status.HTTP_201_CREATED)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs (read-only).
    Only Owner/Admin can view audit logs.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'model_name', 'user']
    search_fields = ['object_repr', 'model_name']
    ordering_fields = ['timestamp', 'action', 'model_name']

    def get_queryset(self):
        if hasattr(self.request, 'tenant') and self.request.tenant:
            return AuditLog.objects.filter(
                organization=self.request.tenant
            ).select_related('user', 'organization')
        return AuditLog.objects.none()
