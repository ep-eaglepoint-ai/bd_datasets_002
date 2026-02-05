"""
Tests for role-based permissions.

Requirements tested:
- #10: Viewer role has read-only access
- #11: Member role can manage tasks but not projects
- #12: Admin role can manage projects, tasks, and team members
- #13: Owner role has full access including organization settings
"""
import pytest


class TestViewerPermissions:
    """Test that viewers have read-only access."""

    @pytest.mark.django_db
    def test_viewer_can_read_projects(self, auth_client_viewer_a, project_a):
        """Verify viewer can read projects."""
        response = auth_client_viewer_a.get('/api/projects/')
        assert response.status_code == 200

    @pytest.mark.django_db
    def test_viewer_can_read_project_detail(self, auth_client_viewer_a, project_a):
        """Verify viewer can read individual project."""
        response = auth_client_viewer_a.get(f'/api/projects/{project_a.id}/')
        assert response.status_code == 200

    @pytest.mark.django_db
    def test_viewer_cannot_create_project(self, auth_client_viewer_a, org_a):
        """Verify viewer cannot create projects - should get 403."""
        response = auth_client_viewer_a.post('/api/projects/', {
            'name': 'Viewer Project',
            'description': 'Should not be created',
            'status': 'planning'
        })
        assert response.status_code == 403, (
            f"Expected 403 Forbidden, got {response.status_code}. "
            "Viewer can create projects - PERMISSION VIOLATION!"
        )

    @pytest.mark.django_db
    def test_viewer_cannot_update_project(self, auth_client_viewer_a, project_a):
        """Verify viewer cannot update projects."""
        response = auth_client_viewer_a.patch(
            f'/api/projects/{project_a.id}/',
            {'name': 'Updated by Viewer'}
        )
        assert response.status_code == 403, (
            f"Expected 403, got {response.status_code}. "
            "Viewer can update projects - PERMISSION VIOLATION!"
        )

    @pytest.mark.django_db
    def test_viewer_cannot_delete_project(self, auth_client_viewer_a, project_a):
        """Verify viewer cannot delete projects."""
        response = auth_client_viewer_a.delete(f'/api/projects/{project_a.id}/')
        assert response.status_code == 403, (
            f"Expected 403, got {response.status_code}. "
            "Viewer can delete projects - PERMISSION VIOLATION!"
        )

    @pytest.mark.django_db
    def test_viewer_can_read_tasks(self, auth_client_viewer_a, task_a):
        """Verify viewer can read tasks."""
        response = auth_client_viewer_a.get('/api/tasks/')
        assert response.status_code == 200

    @pytest.mark.django_db
    def test_viewer_cannot_create_task(self, auth_client_viewer_a, project_a):
        """Verify viewer cannot create tasks."""
        response = auth_client_viewer_a.post('/api/tasks/', {
            'title': 'Viewer Task',
            'description': 'Should not be created',
            'project': str(project_a.id),
            'status': 'todo',
            'priority': 'medium'
        })
        assert response.status_code == 403, (
            f"Expected 403, got {response.status_code}. "
            "Viewer can create tasks - PERMISSION VIOLATION!"
        )

    @pytest.mark.django_db
    def test_viewer_cannot_update_task(self, auth_client_viewer_a, task_a):
        """Verify viewer cannot update tasks."""
        response = auth_client_viewer_a.patch(
            f'/api/tasks/{task_a.id}/',
            {'title': 'Updated by Viewer'}
        )
        assert response.status_code == 403, (
            f"Expected 403, got {response.status_code}. "
            "Viewer can update tasks - PERMISSION VIOLATION!"
        )


class TestMemberPermissions:
    """Test that members can manage tasks but not projects."""

    @pytest.mark.django_db
    def test_member_can_read_projects(self, auth_client_member_a, project_a):
        """Verify member can read projects."""
        response = auth_client_member_a.get('/api/projects/')
        assert response.status_code == 200

    @pytest.mark.django_db
    def test_member_cannot_create_project(self, auth_client_member_a, org_a):
        """Verify member cannot create projects - should get 403."""
        response = auth_client_member_a.post('/api/projects/', {
            'name': 'Member Project',
            'description': 'Should not be created',
            'status': 'planning'
        })
        assert response.status_code == 403, (
            f"Expected 403 Forbidden, got {response.status_code}. "
            "Member can create projects - PERMISSION VIOLATION!"
        )

    @pytest.mark.django_db
    def test_member_cannot_update_project(self, auth_client_member_a, project_a):
        """Verify member cannot update projects."""
        response = auth_client_member_a.patch(
            f'/api/projects/{project_a.id}/',
            {'name': 'Updated by Member'}
        )
        assert response.status_code == 403, (
            f"Expected 403, got {response.status_code}. "
            "Member can update projects - PERMISSION VIOLATION!"
        )

    @pytest.mark.django_db
    def test_member_cannot_delete_project(self, auth_client_member_a, project_a):
        """Verify member cannot delete projects."""
        response = auth_client_member_a.delete(f'/api/projects/{project_a.id}/')
        assert response.status_code == 403, (
            f"Expected 403, got {response.status_code}. "
            "Member can delete projects - PERMISSION VIOLATION!"
        )

    @pytest.mark.django_db
    def test_member_can_create_task(self, auth_client_member_a, project_a):
        """Verify member CAN create tasks."""
        response = auth_client_member_a.post('/api/tasks/', {
            'title': 'Member Task',
            'description': 'Created by member',
            'project': str(project_a.id),
            'status': 'todo',
            'priority': 'medium'
        })
        assert response.status_code == 201, (
            f"Expected 201 Created, got {response.status_code}. "
            f"Member cannot create tasks - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_member_can_update_task(self, auth_client_member_a, task_a):
        """Verify member CAN update tasks."""
        response = auth_client_member_a.patch(
            f'/api/tasks/{task_a.id}/',
            {'title': 'Updated by Member'}
        )
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. "
            f"Member cannot update tasks - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_member_can_delete_task(self, auth_client_member_a, task_a):
        """Verify member CAN delete (soft-delete) tasks."""
        response = auth_client_member_a.delete(f'/api/tasks/{task_a.id}/')
        assert response.status_code == 204, (
            f"Expected 204, got {response.status_code}. "
            f"Member cannot delete tasks"
        )


class TestAdminPermissions:
    """Test that admins can manage projects, tasks, and team members."""

    @pytest.mark.django_db
    def test_admin_can_create_project(self, auth_client_admin_a, user_a_admin):
        """Verify admin CAN create projects."""
        response = auth_client_admin_a.post('/api/projects/', {
            'name': 'Admin Project',
            'description': 'Created by admin',
            'status': 'planning',
            'owner': str(user_a_admin.id)
        })
        assert response.status_code == 201, (
            f"Expected 201 Created, got {response.status_code}. "
            f"Admin cannot create projects - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_admin_can_update_project(self, auth_client_admin_a, project_a):
        """Verify admin CAN update projects."""
        response = auth_client_admin_a.patch(
            f'/api/projects/{project_a.id}/',
            {'name': 'Updated by Admin'}
        )
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. "
            f"Admin cannot update projects - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_admin_can_delete_project(self, auth_client_admin_a, project_a):
        """Verify admin CAN delete (soft-delete) projects."""
        response = auth_client_admin_a.delete(f'/api/projects/{project_a.id}/')
        assert response.status_code == 204, (
            f"Expected 204, got {response.status_code}. "
            f"Admin cannot delete projects"
        )

    @pytest.mark.django_db
    def test_admin_can_create_task(self, auth_client_admin_a, project_a):
        """Verify admin CAN create tasks."""
        response = auth_client_admin_a.post('/api/tasks/', {
            'title': 'Admin Task',
            'description': 'Created by admin',
            'project': str(project_a.id),
            'status': 'todo',
            'priority': 'high'
        })
        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}. "
            f"Admin cannot create tasks - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_admin_can_invite_member(self, auth_client_admin_a, org_a, db):
        """Verify admin CAN invite new members to organization."""
        from core.models import User
        
        # Create a new user to invite
        new_user = User.objects.create_user(
            email='newmember@org-a.com',
            password='testpass123',
            name='New Member'
        )
        
        response = auth_client_admin_a.post(
            f'/api/organizations/{org_a.id}/invite_member/',
            {'user_id': str(new_user.id), 'role': 'member'}
        )
        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}. "
            f"Admin cannot invite members - Response: {response.data}"
        )


class TestOwnerPermissions:
    """Test that owners have full access including organization settings."""

    @pytest.mark.django_db
    def test_owner_can_create_project(self, auth_client_owner_a, user_a_owner):
        """Verify owner CAN create projects."""
        response = auth_client_owner_a.post('/api/projects/', {
            'name': 'Owner Project',
            'description': 'Created by owner',
            'status': 'planning',
            'owner': str(user_a_owner.id)
        })
        assert response.status_code == 201

    @pytest.mark.django_db
    def test_owner_can_update_organization_name(self, auth_client_owner_a, org_a):
        """Verify owner CAN update organization name."""
        response = auth_client_owner_a.patch(
            f'/api/organizations/{org_a.id}/',
            {'name': 'Updated Organization Name'}
        )
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. "
            f"Owner cannot update org name - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_owner_can_update_organization_plan(self, auth_client_owner_a, org_a):
        """Verify owner CAN update organization billing plan."""
        response = auth_client_owner_a.patch(
            f'/api/organizations/{org_a.id}/',
            {'plan': 'enterprise'}
        )
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. "
            f"Owner cannot update org plan - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_owner_can_manage_api_keys(self, auth_client_owner_a, org_a):
        """Verify owner CAN create and manage API keys."""
        response = auth_client_owner_a.post('/api/api-keys/', {
            'name': 'Owner API Key'
        })
        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}. "
            f"Owner cannot create API keys - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_owner_can_view_audit_logs(self, auth_client_owner_a, project_a):
        """Verify owner CAN view audit logs."""
        response = auth_client_owner_a.get('/api/audit-logs/')
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. "
            f"Owner cannot view audit logs"
        )


class TestNonOwnerCannotChangeOrgSettings:
    """Test that non-owners cannot change organization settings."""

    @pytest.mark.django_db
    def test_admin_cannot_update_organization_plan(self, auth_client_admin_a, org_a):
        """Verify admin CANNOT update organization billing plan."""
        response = auth_client_admin_a.patch(
            f'/api/organizations/{org_a.id}/',
            {'plan': 'enterprise'}
        )
        # Admin should not be able to change org settings
        assert response.status_code == 403, (
            f"Expected 403, got {response.status_code}. "
            "Admin can update org settings - PERMISSION VIOLATION!"
        )

    @pytest.mark.django_db
    def test_member_cannot_update_organization(self, auth_client_member_a, org_a):
        """Verify member CANNOT update organization."""
        response = auth_client_member_a.patch(
            f'/api/organizations/{org_a.id}/',
            {'name': 'Hacked Name'}
        )
        assert response.status_code == 403, (
            f"Expected 403, got {response.status_code}. "
            "Member can update organization - PERMISSION VIOLATION!"
        )
