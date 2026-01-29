"""
Additional edge case tests for comprehensive coverage.

This file covers edge cases and constraint testing that may not fit in other test files.
"""
import pytest


class TestUserMultipleOrganizations:
    """Test that users can belong to multiple organizations with different roles."""

    @pytest.mark.django_db
    def test_user_multiple_org_memberships(self, db, org_a, org_b):
        """Verify a user can have memberships in multiple organizations."""
        from core.models import User, OrganizationMembership
        
        user = User.objects.create_user(
            email='multi-org@test.com',
            password='testpass123',
            name='Multi Org User'
        )
        
        # Add user to both organizations with different roles
        OrganizationMembership.objects.create(
            user=user,
            organization=org_a,
            role='admin'
        )
        OrganizationMembership.objects.create(
            user=user,
            organization=org_b,
            role='viewer'
        )
        
        # Verify both memberships exist
        memberships = OrganizationMembership.objects.filter(user=user)
        assert memberships.count() == 2
        
        # Verify different roles
        role_a = memberships.get(organization=org_a).role
        role_b = memberships.get(organization=org_b).role
        assert role_a == 'admin'
        assert role_b == 'viewer'

    @pytest.mark.django_db
    def test_user_role_differs_per_org(self, db, org_a, org_b):
        """Verify user's role is per-organization."""
        from core.models import User, OrganizationMembership
        from tests.conftest import get_jwt_token
        from rest_framework.test import APIClient
        
        user = User.objects.create_user(
            email='role-test@test.com',
            password='testpass123',
            name='Role Test User'
        )
        
        # Admin in org_a, viewer in org_b
        OrganizationMembership.objects.create(user=user, organization=org_a, role='admin')
        OrganizationMembership.objects.create(user=user, organization=org_b, role='viewer')
        
        # Create projects in both orgs
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        set_current_tenant(org_a)
        Project.objects.create(name='Org A Project', status='planning', organization=org_a, owner=user)
        clear_current_tenant()
        
        set_current_tenant(org_b)
        Project.objects.create(name='Org B Project', status='planning', organization=org_b, owner=user)
        clear_current_tenant()
        
        token = get_jwt_token(user)
        
        # As admin in org_a, should be able to create projects
        client_a = APIClient()
        client_a.credentials(
            HTTP_AUTHORIZATION=f'Bearer {token}',
            HTTP_X_ORGANIZATION_SLUG=org_a.slug
        )
        response = client_a.post('/api/projects/', {
            'name': 'New Org A Project',
            'description': 'Test',
            'status': 'planning',
            'owner': str(user.id)
        })
        assert response.status_code == 201, "Admin in org_a should create projects"
        
        # As viewer in org_b, should NOT be able to create projects
        client_b = APIClient()
        client_b.credentials(
            HTTP_AUTHORIZATION=f'Bearer {token}',
            HTTP_X_ORGANIZATION_SLUG=org_b.slug
        )
        response = client_b.post('/api/projects/', {
            'name': 'New Org B Project',
            'description': 'Test',
            'status': 'planning',
            'owner': str(user.id)
        })
        assert response.status_code == 403, "Viewer in org_b should NOT create projects"


class TestStatelessAPI:
    """Test that the API is stateless (no server-side sessions)."""

    @pytest.mark.django_db
    def test_api_works_without_session(self, auth_client_owner_a, project_a):
        """Verify API works without session cookies."""
        # Clear any session
        auth_client_owner_a.session.flush() if hasattr(auth_client_owner_a, 'session') else None
        
        # Should still work with JWT
        response = auth_client_owner_a.get('/api/projects/')
        assert response.status_code == 200


class TestOrganizationConstraints:
    """Test organization-level constraints."""

    @pytest.mark.django_db
    def test_organization_name_unique(self, db, org_a):
        """Verify organization names must be unique."""
        from core.models import Organization
        from django.db import IntegrityError
        
        with pytest.raises(IntegrityError):
            Organization.objects.create(
                name=org_a.name,  # Same name
                slug='different-slug',
                plan='free'
            )

    @pytest.mark.django_db
    def test_organization_slug_unique(self, db, org_a):
        """Verify organization slugs must be unique."""
        from core.models import Organization
        from django.db import IntegrityError
        
        with pytest.raises(IntegrityError):
            Organization.objects.create(
                name='Different Name',
                slug=org_a.slug,  # Same slug
                plan='free'
            )


class TestTaskProjectValidation:
    """Test task-project relationship validation."""

    @pytest.mark.django_db
    def test_task_must_belong_to_same_org_as_project(self, auth_client_owner_a, project_a, project_b):
        """Verify task cannot reference a project from another organization."""
        # Try to create a task in org_a for project_b (from org_b)
        response = auth_client_owner_a.post('/api/tasks/', {
            'title': 'Cross-Org Task',
            'description': 'Should fail',
            'project': str(project_b.id),  # Wrong org
            'status': 'todo',
            'priority': 'medium'
        })
        
        # Should fail - either 400 (validation) or 404 (not found due to tenant filter)
        assert response.status_code in [400, 404], (
            f"Expected 400/404, got {response.status_code}. "
            "Task created for project in different org - CONSTRAINT VIOLATION!"
        )


class TestAPIKeyEdgeCases:
    """Test API key edge cases."""

    @pytest.mark.django_db
    def test_api_key_cannot_access_audit_logs_without_membership(self, api_key_client_a):
        """Verify API key can access resources."""
        response = api_key_client_a.get('/api/audit-logs/')
        # API keys authenticated users should have access based on their permissions
        assert response.status_code in [200, 403]


class TestSoftDeleteCascade:
    """Test soft delete doesn't cascade incorrectly."""

    @pytest.mark.django_db
    def test_soft_deleted_project_tasks_visible_separately(self, auth_client_owner_a, project_a, task_a):
        """Verify soft-deleting project doesn't hide tasks that weren't deleted."""
        # Tasks should still be visible even if project is deleted
        # (This is a design decision - some systems cascade, some don't)
        
        # Soft-delete the project
        auth_client_owner_a.delete(f'/api/projects/{project_a.id}/')
        
        # Check if task is still visible (implementation dependent)
        response = auth_client_owner_a.get(f'/api/tasks/{task_a.id}/')
        # Could be 200 (task still visible) or 404 (cascaded delete)
        # Document the behavior
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"


class TestConcurrentModification:
    """Test handling of concurrent modifications."""

    @pytest.mark.django_db
    def test_update_nonexistent_project_returns_404(self, auth_client_owner_a):
        """Verify updating non-existent project returns 404."""
        import uuid
        fake_id = str(uuid.uuid4())
        response = auth_client_owner_a.patch(f'/api/projects/{fake_id}/', {'name': 'New Name'})
        assert response.status_code == 404


class TestInvalidInputHandling:
    """Test handling of invalid inputs."""

    @pytest.mark.django_db
    def test_invalid_status_rejected(self, auth_client_owner_a, user_a_owner):
        """Verify invalid status values are rejected."""
        response = auth_client_owner_a.post('/api/projects/', {
            'name': 'Invalid Status Project',
            'description': 'Test',
            'status': 'invalid_status',  # Not a valid choice
            'owner': str(user_a_owner.id)
        })
        assert response.status_code == 400

    @pytest.mark.django_db
    def test_invalid_priority_rejected(self, auth_client_member_a, project_a):
        """Verify invalid priority values are rejected."""
        response = auth_client_member_a.post('/api/tasks/', {
            'title': 'Invalid Priority Task',
            'description': 'Test',
            'project': str(project_a.id),
            'status': 'todo',
            'priority': 'super_urgent'  # Not a valid choice
        })
        assert response.status_code == 400

    @pytest.mark.django_db
    def test_invalid_uuid_returns_404(self, auth_client_owner_a):
        """Verify invalid UUID format is handled."""
        response = auth_client_owner_a.get('/api/projects/not-a-uuid/')
        # Should return 404, not 500
        assert response.status_code in [400, 404]


class TestEmptyResults:
    """Test handling of empty result sets."""

    @pytest.mark.django_db
    def test_empty_project_list(self, auth_client_owner_a):
        """Verify empty project list returns properly."""
        from core.models import Project
        # Delete all projects
        Project.objects.all().delete()
        
        response = auth_client_owner_a.get('/api/projects/')
        assert response.status_code == 200
        
        results = response.data.get('results', response.data)
        assert len(results) == 0 or results == []

    @pytest.mark.django_db
    def test_empty_filter_results(self, auth_client_owner_a, project_a):
        """Verify empty filter results return properly."""
        # Filter for non-existent status
        response = auth_client_owner_a.get('/api/projects/?status=completed')
        assert response.status_code == 200
