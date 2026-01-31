"""
Tests for audit logging functionality.

Requirements tested:
- #8: Audit logs cannot be modified or deleted after creation
- #9: Audit logs record what changed on each update
"""
import pytest


class TestAuditLogImmutability:
    """Test that audit logs cannot be modified or deleted."""

    @pytest.mark.django_db
    def test_audit_log_cannot_be_modified(self, db, org_a, user_a_owner, project_a):
        """Verify audit logs cannot be modified after creation."""
        from core.models import AuditLog
        
        # Find an audit log entry (created when project_a was created)
        audit_log = AuditLog.objects.filter(
            organization=org_a,
            model_name='Project'
        ).first()
        
        if audit_log:
            # Attempt to modify the audit log
            audit_log.action = 'delete'
            
            with pytest.raises(ValueError) as exc_info:
                audit_log.save()
            
            assert "cannot be modified" in str(exc_info.value).lower(), (
                f"Expected 'cannot be modified' error, got: {exc_info.value}"
            )

    @pytest.mark.django_db
    def test_audit_log_cannot_be_deleted(self, db, org_a, project_a):
        """Verify audit logs cannot be deleted."""
        from core.models import AuditLog
        
        # Find an audit log entry
        audit_log = AuditLog.objects.filter(
            organization=org_a,
            model_name='Project'
        ).first()
        
        if audit_log:
            # Attempt to delete the audit log
            with pytest.raises(ValueError) as exc_info:
                audit_log.delete()
            
            assert "cannot be deleted" in str(exc_info.value).lower(), (
                f"Expected 'cannot be deleted' error, got: {exc_info.value}"
            )

    @pytest.mark.django_db
    def test_audit_log_created_on_project_create(self, auth_client_owner_a, user_a_owner):
        """Verify audit log is created when a project is created."""
        from core.models import AuditLog
        
        # Count existing audit logs
        initial_count = AuditLog.objects.count()
        
        # Create a project
        response = auth_client_owner_a.post('/api/projects/', {
            'name': 'Audit Test Project',
            'description': 'Testing audit logging',
            'status': 'planning',
            'owner': str(user_a_owner.id)
        })
        assert response.status_code == 201
        
        # Should have created an audit log entry
        new_count = AuditLog.objects.count()
        assert new_count > initial_count, "No audit log created for project creation"

    @pytest.mark.django_db
    def test_audit_log_created_on_task_create(self, auth_client_member_a, project_a):
        """Verify audit log is created when a task is created."""
        from core.models import AuditLog
        
        initial_count = AuditLog.objects.filter(model_name='Task').count()
        
        response = auth_client_member_a.post('/api/tasks/', {
            'title': 'Audit Test Task',
            'description': 'Testing audit logging',
            'project': str(project_a.id),
            'status': 'todo',
            'priority': 'medium'
        })
        assert response.status_code == 201
        
        new_count = AuditLog.objects.filter(model_name='Task').count()
        assert new_count > initial_count, "No audit log created for task creation"


class TestAuditLogChangeTracking:
    """Test that audit logs record what changed on updates."""

    @pytest.mark.django_db
    def test_audit_log_records_changes_on_update(self, auth_client_owner_a, project_a):
        """Verify audit log records old and new values on update."""
        from core.models import AuditLog
        
        original_name = project_a.name
        new_name = 'Updated Project Name'
        
        # Update the project
        response = auth_client_owner_a.patch(
            f'/api/projects/{project_a.id}/',
            {'name': new_name}
        )
        assert response.status_code == 200
        
        # Find the update audit log
        audit_log = AuditLog.objects.filter(
            object_id=project_a.id,
            action='update'
        ).order_by('-timestamp').first()
        
        assert audit_log is not None, "No update audit log found"
        assert audit_log.changes, "Audit log has no changes recorded"
        
        # Verify the change tracking
        if 'name' in audit_log.changes:
            change = audit_log.changes['name']
            assert 'old' in change, "Change record missing 'old' value"
            assert 'new' in change, "Change record missing 'new' value"
            assert change['old'] == original_name or str(change['old']) == original_name
            assert change['new'] == new_name or str(change['new']) == new_name

    @pytest.mark.django_db
    def test_audit_log_records_user(self, auth_client_owner_a, project_a, user_a_owner):
        """Verify audit log records the user who made the change."""
        from core.models import AuditLog
        
        # Update the project
        response = auth_client_owner_a.patch(
            f'/api/projects/{project_a.id}/',
            {'description': 'Updated description'}
        )
        assert response.status_code == 200
        
        # Find the update audit log
        audit_log = AuditLog.objects.filter(
            object_id=project_a.id,
            action='update'
        ).order_by('-timestamp').first()
        
        assert audit_log is not None, "No update audit log found"
        assert audit_log.user is not None, (
            "Audit log does not record user - AUDIT TRAIL INCOMPLETE!"
        )
        assert audit_log.user.id == user_a_owner.id, (
            f"Wrong user recorded. Expected {user_a_owner.id}, got {audit_log.user.id}"
        )

    @pytest.mark.django_db
    def test_audit_log_records_delete_action(self, auth_client_owner_a, project_a):
        """Verify audit log records soft-delete operations."""
        from core.models import AuditLog
        
        initial_count = AuditLog.objects.filter(
            object_id=project_a.id,
            action__in=['delete', 'update', 'soft_delete']
        ).count()
        
        # Delete (soft-delete) the project
        response = auth_client_owner_a.delete(f'/api/projects/{project_a.id}/')
        assert response.status_code == 204
        
        # Should have a soft_delete audit log
        new_count = AuditLog.objects.filter(
            object_id=project_a.id,
            action__in=['delete', 'update', 'soft_delete']
        ).count()
        
        assert new_count > initial_count, (
            "No audit log created for delete operation"
        )

    @pytest.mark.django_db
    def test_audit_log_via_api_is_read_only(self, auth_client_owner_a, org_a, project_a):
        """Verify audit logs API is read-only."""
        from core.models import AuditLog
        
        audit_log = AuditLog.objects.filter(organization=org_a).first()
        
        if audit_log:
            # Attempt to update via API
            response = auth_client_owner_a.patch(
                f'/api/audit-logs/{audit_log.id}/',
                {'action': 'hacked'}
            )
            # Should be 405 Method Not Allowed or 403
            assert response.status_code in [403, 405], (
                f"Expected 403/405, got {response.status_code}. "
                "Audit logs can be modified via API!"
            )
            
            # Attempt to delete via API
            response = auth_client_owner_a.delete(f'/api/audit-logs/{audit_log.id}/')
            assert response.status_code in [403, 405], (
                f"Expected 403/405, got {response.status_code}. "
                "Audit logs can be deleted via API!"
            )


class TestAuditLogContent:
    """Test audit log content and structure."""

    @pytest.mark.django_db
    def test_audit_log_contains_required_fields(self, db, org_a, project_a):
        """Verify audit log entries contain all required fields."""
        from core.models import AuditLog
        
        audit_log = AuditLog.objects.filter(
            organization=org_a,
            model_name='Project'
        ).first()
        
        if audit_log:
            assert audit_log.organization_id is not None
            assert audit_log.action in ['create', 'update', 'delete', 'soft_delete', 'restore']
            assert audit_log.model_name is not None
            assert audit_log.object_id is not None
            assert audit_log.object_repr is not None
            assert audit_log.timestamp is not None

    @pytest.mark.django_db
    def test_audit_log_scoped_to_organization(self, auth_client_owner_a, auth_client_owner_b, org_a, org_b):
        """Verify audit logs are scoped to organization."""
        from core.models import AuditLog
        
        # Get audit logs for org_a
        response = auth_client_owner_a.get('/api/audit-logs/')
        assert response.status_code == 200
        
        logs_a = response.data.get('results', response.data)
        
        # Verify all logs belong to org_a
        for log in logs_a:
            audit_obj = AuditLog.objects.get(id=log['id'])
            assert audit_obj.organization_id == org_a.id, (
                f"Audit log {log['id']} belongs to wrong org!"
            )
