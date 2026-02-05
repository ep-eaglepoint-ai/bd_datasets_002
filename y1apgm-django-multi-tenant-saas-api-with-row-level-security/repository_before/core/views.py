from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

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
from .permissions import IsTenantMember, IsOwnerOrAdmin, CanManageProjects, CanManageTasks


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Organization.objects.filter(
                memberships__user=self.request.user,
                is_deleted=False
            ).distinct()
        return Organization.objects.none()

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        organization = self.get_object()
        memberships = OrganizationMembership.objects.filter(organization=organization)
        serializer = OrganizationMembershipSerializer(memberships, many=True)
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        if hasattr(self.request, 'tenant') and self.request.tenant:
            return User.objects.filter(
                memberships__organization=self.request.tenant
            ).distinct()
        return User.objects.none()

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, CanManageProjects]

    def get_queryset(self):
        return Project.objects.all()

    def perform_destroy(self, instance):
        instance.soft_delete()

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        project = Project.all_objects.get(pk=pk)
        if not project.is_deleted:
            return Response(
                {'error': 'Project is not deleted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        project.restore()
        serializer = self.get_serializer(project)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def deleted(self, request):
        queryset = Project.all_objects.filter(is_deleted=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, CanManageTasks]

    def get_queryset(self):
        return Task.objects.all()

    def perform_destroy(self, instance):
        instance.soft_delete()

    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        queryset = self.get_queryset().filter(assignee=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class APIKeyViewSet(viewsets.ModelViewSet):
    serializer_class = APIKeySerializer
    permission_classes = [IsAuthenticated, IsTenantMember, IsOwnerOrAdmin]
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        if hasattr(self.request, 'tenant') and self.request.tenant:
            return APIKey.objects.filter(organization=self.request.tenant)
        return APIKey.objects.none()

    def create(self, request, *args, **kwargs):
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
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, IsOwnerOrAdmin]

    def get_queryset(self):
        if hasattr(self.request, 'tenant') and self.request.tenant:
            return AuditLog.objects.filter(organization=self.request.tenant)
        return AuditLog.objects.none()

