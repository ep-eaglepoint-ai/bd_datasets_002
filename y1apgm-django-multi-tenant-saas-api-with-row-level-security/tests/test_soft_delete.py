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
