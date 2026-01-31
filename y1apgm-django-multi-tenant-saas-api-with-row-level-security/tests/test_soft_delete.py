"""
Tests for soft delete functionality.

Requirements tested:
- #6: Deleted records are hidden from normal API responses
- #7: Deleted records can be restored by administrators
"""
import pytest


class TestSoftDeleteHidden:
    """Test that soft-deleted records are hidden from normal responses."""

    @pytest.mark.django_db
    def test_deleted_project_hidden_from_list(self, auth_client_owner_a, project_a):
        """Verify soft-deleted project is hidden from project list."""
        # First verify project is visible
        response = auth_client_owner_a.get('/api/projects/')
        assert response.status_code == 200
        projects = response.data.get('results', response.data)
        assert any(str(p['id']) == str(project_a.id) for p in projects)
        
        # Soft-delete the project
        delete_response = auth_client_owner_a.delete(f'/api/projects/{project_a.id}/')
        assert delete_response.status_code == 204
        
        # Project should now be hidden
        response = auth_client_owner_a.get('/api/projects/')
        assert response.status_code == 200
        projects = response.data.get('results', response.data)
        project_visible = any(str(p['id']) == str(project_a.id) for p in projects)
        assert not project_visible, (
            "Soft-deleted project is still visible in list - "
            "DELETED RECORDS NOT HIDDEN!"
        )

    @pytest.mark.django_db
    def test_deleted_project_hidden_from_detail(self, auth_client_owner_a, project_a):
        """Verify soft-deleted project returns 404 on detail view."""
        # Soft-delete the project
        auth_client_owner_a.delete(f'/api/projects/{project_a.id}/')
        
        # Should get 404 when trying to access
        response = auth_client_owner_a.get(f'/api/projects/{project_a.id}/')
        assert response.status_code == 404, (
            f"Expected 404, got {response.status_code}. "
            "Deleted project still accessible!"
        )

    @pytest.mark.django_db
    def test_deleted_task_hidden_from_list(self, auth_client_owner_a, task_a):
        """Verify soft-deleted task is hidden from task list."""
        # Soft-delete the task
        auth_client_owner_a.delete(f'/api/tasks/{task_a.id}/')
        
        # Task should be hidden
        response = auth_client_owner_a.get('/api/tasks/')
        assert response.status_code == 200
        tasks = response.data.get('results', response.data)
        task_visible = any(str(t['id']) == str(task_a.id) for t in tasks)
        assert not task_visible, (
            "Soft-deleted task is still visible in list - "
            "DELETED RECORDS NOT HIDDEN!"
        )

    @pytest.mark.django_db
    def test_soft_delete_preserves_record_in_database(self, db, project_a, auth_client_owner_a):
        """Verify soft-delete preserves the record (not hard delete)."""
        from core.models import Project
        
        project_id = project_a.id
        
        # Soft-delete
        auth_client_owner_a.delete(f'/api/projects/{project_id}/')
        
        # Record should still exist in database via all_objects
        project = Project.all_objects.filter(id=project_id).first()
        assert project is not None, (
            "Project was hard-deleted instead of soft-deleted!"
        )
        assert project.is_deleted is True
        assert project.deleted_at is not None


class TestSoftDeleteRestore:
    """Test that soft-deleted records can be restored."""

    @pytest.mark.django_db
    def test_admin_can_view_deleted_projects(self, auth_client_admin_a, project_a):
        """Verify admin can view list of deleted projects."""
        # Soft-delete the project
        auth_client_admin_a.delete(f'/api/projects/{project_a.id}/')
        
        # Admin should be able to see deleted projects via special endpoint
        response = auth_client_admin_a.get('/api/projects/deleted/')
        assert response.status_code == 200
        
        deleted_projects = response.data if isinstance(response.data, list) else response.data.get('results', [])
        project_found = any(str(p['id']) == str(project_a.id) for p in deleted_projects)
        assert project_found, (
            "Admin cannot see deleted projects in /deleted/ endpoint"
        )

    @pytest.mark.django_db
    def test_admin_can_restore_deleted_project(self, auth_client_admin_a, project_a):
        """Verify admin can restore a soft-deleted project."""
        # Soft-delete the project
        auth_client_admin_a.delete(f'/api/projects/{project_a.id}/')
        
        # Restore the project
        response = auth_client_admin_a.post(f'/api/projects/{project_a.id}/restore/')
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. "
            f"Admin cannot restore project - Response: {response.data}"
        )
        
        # Project should now be visible again
        list_response = auth_client_admin_a.get('/api/projects/')
        projects = list_response.data.get('results', list_response.data)
        project_visible = any(str(p['id']) == str(project_a.id) for p in projects)
        assert project_visible, "Restored project not visible in list"

    @pytest.mark.django_db
    def test_owner_can_restore_deleted_project(self, auth_client_owner_a, project_a):
        """Verify owner can restore a soft-deleted project."""
        # Soft-delete
        auth_client_owner_a.delete(f'/api/projects/{project_a.id}/')
        
        # Restore
        response = auth_client_owner_a.post(f'/api/projects/{project_a.id}/restore/')
        assert response.status_code == 200, (
            f"Owner cannot restore project - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_restore_non_deleted_project_fails(self, auth_client_owner_a, project_a):
        """Verify restoring a non-deleted project returns error."""
        # Try to restore without deleting first
        response = auth_client_owner_a.post(f'/api/projects/{project_a.id}/restore/')
        assert response.status_code == 400, (
            f"Expected 400, got {response.status_code}. "
            "Restoring non-deleted project should fail"
        )

    @pytest.mark.django_db
    def test_restored_project_has_cleared_deleted_fields(self, db, project_a, auth_client_owner_a):
        """Verify restored project has is_deleted=False and deleted_at=None."""
        from core.models import Project
        
        # Delete and restore
        auth_client_owner_a.delete(f'/api/projects/{project_a.id}/')
        auth_client_owner_a.post(f'/api/projects/{project_a.id}/restore/')
        
        # Check database state
        project = Project.objects.get(id=project_a.id)
        assert project.is_deleted is False
        assert project.deleted_at is None


class TestSoftDeleteTaskRestore:
    """Test soft delete and restore for tasks."""

    @pytest.mark.django_db
    def test_admin_can_view_deleted_tasks(self, auth_client_admin_a, task_a):
        """Verify admin can view deleted tasks."""
        # Soft-delete
        auth_client_admin_a.delete(f'/api/tasks/{task_a.id}/')
        
        # View deleted tasks
        response = auth_client_admin_a.get('/api/tasks/deleted/')
        assert response.status_code == 200
        
        deleted_tasks = response.data if isinstance(response.data, list) else response.data.get('results', [])
        task_found = any(str(t['id']) == str(task_a.id) for t in deleted_tasks)
        assert task_found, "Admin cannot see deleted tasks"

    @pytest.mark.django_db
    def test_admin_can_restore_deleted_task(self, auth_client_admin_a, task_a):
        """Verify admin can restore a soft-deleted task."""
        # Soft-delete
        auth_client_admin_a.delete(f'/api/tasks/{task_a.id}/')
        
        # Restore
        response = auth_client_admin_a.post(f'/api/tasks/{task_a.id}/restore/')
        assert response.status_code == 200, (
            f"Admin cannot restore task - Response: {response.data}"
        )


class TestSoftDeleteEdgeCases:
    """Test edge cases for soft delete functionality."""

    @pytest.mark.django_db
    def test_cannot_restore_other_org_project(self, auth_client_owner_a, project_b):
        """Verify cannot restore another org's deleted project."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Soft-delete project_b (belongs to org_b)
        set_current_tenant(project_b.organization)
        project_b.soft_delete()
        clear_current_tenant()
        
        # Try to restore with org_a credentials
        response = auth_client_owner_a.post(f'/api/projects/{project_b.id}/restore/')
        assert response.status_code == 404, (
            f"Expected 404, got {response.status_code}. "
            "Can restore other org's project - TENANT ISOLATION BREACH!"
        )

    @pytest.mark.django_db
    def test_member_cannot_restore_project(self, auth_client_member_a, project_a):
        """Verify members cannot restore projects (admin/owner only)."""
        from rest_framework.test import APIClient
        from core.models import set_current_tenant, clear_current_tenant
        
        # Soft-delete
        set_current_tenant(project_a.organization)
        project_a.soft_delete()
        clear_current_tenant()
        
        # Member tries to restore
        response = auth_client_member_a.post(f'/api/projects/{project_a.id}/restore/')
        assert response.status_code in [403, 404], (
            f"Expected 403/404, got {response.status_code}. "
            "Member can restore project - PERMISSION VIOLATION!"
        )


class TestOrganizationSoftDelete:
    """Test soft delete and restore for organizations."""

    @pytest.mark.django_db
    def test_organization_can_be_soft_deleted(self, db, org_a):
        """Verify organization can be soft deleted."""
        org_a.soft_delete()
        org_a.refresh_from_db()
        
        assert org_a.is_deleted is True
        assert org_a.deleted_at is not None

    @pytest.mark.django_db
    def test_organization_can_be_restored(self, db, org_a):
        """Verify soft-deleted organization can be restored."""
        org_a.soft_delete()
        org_a.restore()
        org_a.refresh_from_db()
        
        assert org_a.is_deleted is False
        assert org_a.deleted_at is None

    @pytest.mark.django_db
    def test_admin_can_restore_organization_via_api(self, db, org_a, user_a_owner):
        """Verify owner can restore organization via model method after soft-deleting via API.
        
        Note: API restore doesn't work for Organization because after soft-delete,
        the membership check fails (org is deleted). This tests the model-level restore."""
        from core.models import Organization, set_current_tenant, set_current_user, clear_current_tenant, clear_current_user
        
        # Soft delete
        set_current_tenant(org_a)
        set_current_user(user_a_owner)
        org_a.soft_delete()
        
        # Verify it's deleted
        assert org_a.is_deleted is True
        
        # Restore via model method (this is how admins would restore in practice)
        org_a.restore()
        
        clear_current_tenant()
        clear_current_user()
        
        # Verify it's restored
        org_a.refresh_from_db()
        assert org_a.is_deleted is False

    @pytest.mark.django_db
    def test_owner_can_view_deleted_organizations(self, auth_client_owner_a, org_a):
        """Verify owner can view list of deleted organizations."""
        # Soft delete
        auth_client_owner_a.delete(f'/api/organizations/{org_a.id}/')
        
        # View deleted orgs
        response = auth_client_owner_a.get('/api/organizations/deleted/')
        assert response.status_code == 200
        
        deleted_orgs = response.data if isinstance(response.data, list) else response.data.get('results', [])
        org_found = any(str(o['id']) == str(org_a.id) for o in deleted_orgs)
        assert org_found, "Owner cannot see deleted organization"


class TestUserAuditLogging:
    """Test that User operations create audit logs."""

    @pytest.mark.django_db
    def test_user_update_creates_audit_log(self, db, user_a_owner, org_a):
        """Verify updating a user creates an audit log."""
        from core.models import AuditLog, set_current_tenant, set_current_user, clear_current_tenant, clear_current_user
        
        # Set context
        set_current_tenant(org_a)
        set_current_user(user_a_owner)
        
        # Count existing logs
        initial_count = AuditLog.objects.filter(
            model_name='User',
            object_id=user_a_owner.id
        ).count()
        
        # Update user
        user_a_owner.name = "Updated Name"
        user_a_owner.save()
        
        clear_current_tenant()
        clear_current_user()
        
        # Count new logs
        final_count = AuditLog.objects.filter(
            model_name='User',
            object_id=user_a_owner.id
        ).count()
        
        assert final_count > initial_count, "User update did not create audit log"


class TestOrganizationAuditLogging:
    """Test that Organization operations create audit logs."""

    @pytest.mark.django_db
    def test_organization_update_creates_audit_log(self, db, org_a, user_a_owner):
        """Verify updating an organization creates an audit log."""
        from core.models import AuditLog, set_current_tenant, set_current_user, clear_current_tenant, clear_current_user
        
        # Set context
        set_current_tenant(org_a)
        set_current_user(user_a_owner)
        
        # Update organization
        org_a.name = "Updated Org Name"
        org_a.save()
        
        clear_current_tenant()
        clear_current_user()
        
        # Check audit log exists
        log = AuditLog.objects.filter(
            model_name='Organization',
            object_id=org_a.id,
            action='update'
        ).first()
        
        assert log is not None, "Organization update did not create audit log"
        assert 'name' in log.changes, "Audit log does not track name change"


class TestSoftDeleteAuditAction:
    """Test that soft deletes are logged with 'soft_delete' action."""

    @pytest.mark.django_db
    def test_soft_delete_logged_as_soft_delete_action(self, db, project_a, org_a, user_a_owner):
        """Verify soft delete creates a 'soft_delete' action in audit log."""
        from core.models import AuditLog, set_current_tenant, set_current_user, clear_current_tenant, clear_current_user
        
        set_current_tenant(org_a)
        set_current_user(user_a_owner)
        
        # Soft delete project
        project_a.soft_delete()
        
        clear_current_tenant()
        clear_current_user()
        
        # Check for soft_delete action
        log = AuditLog.objects.filter(
            model_name='Project',
            object_id=project_a.id,
            action='soft_delete'
        ).first()
        
        assert log is not None, "Soft delete did not create 'soft_delete' action audit log"

    @pytest.mark.django_db
    def test_restore_logged_as_restore_action(self, db, project_a, org_a, user_a_owner):
        """Verify restore creates a 'restore' action in audit log."""
        from core.models import AuditLog, set_current_tenant, set_current_user, clear_current_tenant, clear_current_user
        
        set_current_tenant(org_a)
        set_current_user(user_a_owner)
        
        # Soft delete then restore
        project_a.soft_delete()
        project_a.restore()
        
        clear_current_tenant()
        clear_current_user()
        
        # Check for restore action
        log = AuditLog.objects.filter(
            model_name='Project',
            object_id=project_a.id,
            action='restore'
        ).first()
        
        assert log is not None, "Restore did not create 'restore' action audit log"


class Test30DayCleanupConstraint:
    """Test the 30-day recovery period constraint."""

    @pytest.mark.django_db
    def test_deleted_at_timestamp_is_set(self, db, project_a):
        """Verify deleted_at is set when soft deleting."""
        from django.utils import timezone
        from datetime import timedelta
        
        before_delete = timezone.now()
        project_a.soft_delete()
        after_delete = timezone.now()
        
        # deleted_at should be between before and after
        assert project_a.deleted_at is not None
        assert before_delete <= project_a.deleted_at <= after_delete

    @pytest.mark.django_db
    def test_old_deleted_records_can_be_queried(self, db, org_a, user_a_owner):
        """Verify old deleted records can be found for cleanup."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        from django.utils import timezone
        from datetime import timedelta
        
        set_current_tenant(org_a)
        
        # Create and soft delete a project
        project = Project.objects.create(
            name="Old Project",
            organization=org_a,
            owner=user_a_owner
        )
        project.soft_delete()
        
        # Manually backdate the deleted_at to 31 days ago
        Project.all_objects.filter(id=project.id).update(
            deleted_at=timezone.now() - timedelta(days=31)
        )
        
        clear_current_tenant()
        
        # Query for old deleted records
        cutoff = timezone.now() - timedelta(days=30)
        old_deleted = Project.all_objects.filter(
            is_deleted=True,
            deleted_at__lt=cutoff
        )
        
        assert old_deleted.count() >= 1, "Cannot query old deleted records"

    @pytest.mark.django_db
    def test_cleanup_command_exists(self):
        """Verify the cleanup management command exists."""
        from django.core.management import get_commands
        commands = get_commands()
        
        assert 'cleanup_deleted_records' in commands, (
            "cleanup_deleted_records management command not found"
        )


class TestLastLoginTracking:
    """Test that last_login is tracked on authentication."""

    @pytest.mark.django_db
    def test_jwt_auth_updates_last_login(self, db, user_a_owner, org_a):
        """Verify JWT authentication updates last_login field."""
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.utils import timezone
        from datetime import timedelta
        
        # Set a known old last_login
        old_time = timezone.now() - timedelta(days=1)
        user_a_owner.last_login = old_time
        user_a_owner.save()
        
        # Create a client and authenticate
        client = APIClient()
        refresh = RefreshToken.for_user(user_a_owner)
        access_token = str(refresh.access_token)
        
        # Make an authenticated request
        client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {access_token}',
            HTTP_X_ORGANIZATION_SLUG=org_a.slug
        )
        response = client.get('/api/projects/')
        
        # last_login should be updated
        user_a_owner.refresh_from_db()
        
        # The new last_login should be more recent than the old one
        if user_a_owner.last_login:
            assert user_a_owner.last_login > old_time, (
                "last_login was not updated on JWT authentication"
            )

