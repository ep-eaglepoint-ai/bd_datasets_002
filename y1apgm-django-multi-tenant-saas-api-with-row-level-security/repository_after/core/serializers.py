from rest_framework import serializers
from django.db.models import Count

from .models import Organization, User, OrganizationMembership, Project, Task, APIKey, AuditLog


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'plan', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'is_active', 'role', 'created_at', 'last_login']
        read_only_fields = ['id', 'created_at', 'last_login']

    def get_role(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'tenant') and request.tenant:
            membership = OrganizationMembership.objects.filter(
                user=obj,
                organization=request.tenant
            ).first()
            if membership:
                return membership.role
        return None


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ['id', 'user', 'user_email', 'user_name', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProjectSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status', 'owner',
            'owner_email', 'owner_name', 'task_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else None

    def get_owner_name(self, obj):
        return obj.owner.name if obj.owner else None

    def get_task_count(self, obj):
        # Use annotated value if available (for optimized queries)
        if hasattr(obj, 'active_task_count'):
            return obj.active_task_count
        return obj.tasks.filter(is_deleted=False).count()

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'tenant') and request.tenant:
            validated_data['organization'] = request.tenant
        return super().create(validated_data)


class TaskSerializer(serializers.ModelSerializer):
    assignee_email = serializers.SerializerMethodField()
    assignee_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority',
            'project', 'project_name', 'assignee', 'assignee_email',
            'assignee_name', 'due_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assignee_email(self, obj):
        return obj.assignee.email if obj.assignee else None

    def get_assignee_name(self, obj):
        return obj.assignee.name if obj.assignee else None

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'tenant') and request.tenant:
            validated_data['organization'] = request.tenant
        return super().create(validated_data)

    def validate_project(self, value):
        """Ensure the project belongs to the current tenant."""
        request = self.context.get('request')
        if request and hasattr(request, 'tenant') and request.tenant:
            if value.organization != request.tenant:
                raise serializers.ValidationError(
                    "Project does not belong to the current organization"
                )
        return value


class APIKeySerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)

    class Meta:
        model = APIKey
        fields = ['id', 'name', 'key', 'created_at', 'last_used_at', 'is_active']
        read_only_fields = ['id', 'key', 'created_at', 'last_used_at']


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'model_name',
            'object_id', 'object_repr', 'changes', 'timestamp'
        ]
        read_only_fields = ['id', 'user', 'user_email', 'action', 'model_name',
                            'object_id', 'object_repr', 'changes', 'timestamp']

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None
