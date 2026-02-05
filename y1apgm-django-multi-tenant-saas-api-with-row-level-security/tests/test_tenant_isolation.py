"""
Tests for tenant isolation - ensuring organizations cannot access each other's data.

Requirements tested:
- #3: Tenant context is isolated per request
- #4: Queries automatically filter by current tenant
- #5: User in Organization A cannot access Organization B resources
"""
import pytest


class TestTenantIsolation:
    """Test that tenants are properly isolated from each other."""

    @pytest.mark.django_db
    def test_org_a_cannot_see_org_b_projects_via_api(
        self, auth_client_owner_a, project_a, project_b
    ):
        """Verify Org A user cannot see Org B projects in API response."""
        response = auth_client_owner_a.get('/api/projects/')
        assert response.status_code == 200
        
        # Should only see project_a, not project_b
        project_ids = [p['id'] for p in response.data.get('results', response.data)]
        assert str(project_a.id) in project_ids or project_a.id in [p['id'] for p in response.data.get('results', response.data)]
        
        # project_b should NOT be visible
        project_b_visible = any(
            str(project_b.id) == str(p.get('id', p)) 
            for p in response.data.get('results', response.data)
        )
        assert not project_b_visible, "Org A user can see Org B project - TENANT ISOLATION BREACH!"

    @pytest.mark.django_db
    def test_org_a_cannot_access_org_b_project_by_id(
        self, auth_client_owner_a, project_b
    ):
        """Verify Org A user gets 404 when accessing Org B project by ID."""
        response = auth_client_owner_a.get(f'/api/projects/{project_b.id}/')
        assert response.status_code == 404, (
            f"Expected 404, got {response.status_code}. "
            "Org A can access Org B project - TENANT ISOLATION BREACH!"
        )

    @pytest.mark.django_db
    def test_org_a_cannot_see_org_b_tasks(
        self, auth_client_owner_a, task_a, task_b
    ):
        """Verify Org A user cannot see Org B tasks."""
        response = auth_client_owner_a.get('/api/tasks/')
        assert response.status_code == 200
        
        # task_b should NOT be visible
        task_b_visible = any(
            str(task_b.id) == str(t.get('id', t)) 
            for t in response.data.get('results', response.data)
        )
        assert not task_b_visible, "Org A user can see Org B task - TENANT ISOLATION BREACH!"

    @pytest.mark.django_db
    def test_org_a_cannot_update_org_b_project(
        self, auth_client_owner_a, project_b
    ):
        """Verify Org A user cannot update Org B project."""
        response = auth_client_owner_a.patch(
            f'/api/projects/{project_b.id}/',
            {'name': 'Hacked Project Name'}
        )
        assert response.status_code == 404, (
            f"Expected 404, got {response.status_code}. "
            "Org A can update Org B project - TENANT ISOLATION BREACH!"
        )

    @pytest.mark.django_db
    def test_org_a_cannot_delete_org_b_project(
        self, auth_client_owner_a, project_b
    ):
        """Verify Org A user cannot delete Org B project."""
        response = auth_client_owner_a.delete(f'/api/projects/{project_b.id}/')
        assert response.status_code == 404, (
            f"Expected 404, got {response.status_code}. "
            "Org A can delete Org B project - TENANT ISOLATION BREACH!"
        )

    @pytest.mark.django_db
    def test_queries_auto_filter_by_tenant(self, db, org_a, org_b, project_a, project_b):
        """Verify Project.objects.all() returns only current tenant's projects."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Set tenant to org_a
        set_current_tenant(org_a)
        projects_a = list(Project.objects.all())
        clear_current_tenant()
        
        # Should only see org_a projects
        assert len(projects_a) == 1
        assert projects_a[0].id == project_a.id
        
        # Set tenant to org_b
        set_current_tenant(org_b)
        projects_b = list(Project.objects.all())
        clear_current_tenant()
        
        # Should only see org_b projects
        assert len(projects_b) == 1
        assert projects_b[0].id == project_b.id

    @pytest.mark.django_db
    def test_tenant_context_cleared_after_request(
        self, auth_client_owner_a, project_a
    ):
        """Verify tenant context is cleared after each request."""
        from core.models import get_current_tenant
        
        # Make a request
        response = auth_client_owner_a.get('/api/projects/')
        assert response.status_code == 200
        
        # After request, tenant context should be cleared
        assert get_current_tenant() is None, (
            "Tenant context not cleared after request - potential data leakage!"
        )


class TestConcurrentTenantIsolation:
    """Test tenant isolation under concurrent access patterns."""

    @pytest.mark.django_db
    def test_different_org_requests_isolated(
        self, auth_client_owner_a, auth_client_owner_b, project_a, project_b
    ):
        """Verify different org requests maintain isolation."""
        response_a = auth_client_owner_a.get('/api/projects/')
        assert response_a.status_code == 200
        
        response_b = auth_client_owner_b.get('/api/projects/')
        assert response_b.status_code == 200
        
        projects_a = response_a.data.get('results', response_a.data)
        for p in projects_a:
            assert str(p['id']) == str(project_a.id), f"Org A sees wrong project: {p}"
        
        projects_b = response_b.data.get('results', response_b.data)
        for p in projects_b:
            assert str(p['id']) == str(project_b.id), f"Org B sees wrong project: {p}"

    @pytest.mark.django_db(transaction=True)
    def test_rapid_tenant_switching_isolation(self, db, org_a, org_b, project_a, project_b):
        """R3 FIX: Verify tenant isolation under rapid concurrent-like context switching."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        for _ in range(50):
            set_current_tenant(org_a)
            projects_a = list(Project.objects.all())
            clear_current_tenant()
            
            set_current_tenant(org_b)
            projects_b = list(Project.objects.all())
            clear_current_tenant()
            
            assert all(p.organization_id == org_a.id for p in projects_a), \
                "Cross-tenant data leakage detected in org_a query!"
            assert all(p.organization_id == org_b.id for p in projects_b), \
                "Cross-tenant data leakage detected in org_b query!"


class TestTenantModelManager:
    """Test the TenantManager and TenantSoftDeleteManager."""

    @pytest.mark.django_db
    def test_tenant_manager_filters_by_org(self, db, org_a, org_b, project_a, project_b):
        """Verify TenantManager filters queryset by organization."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Without tenant set, should see all (if no tenant filtering)
        # With correct implementation, this should show nothing or all
        set_current_tenant(None)
        all_projects = list(Project.objects.all())
        clear_current_tenant()
        
        # Set to org_a
        set_current_tenant(org_a)
        org_a_projects = list(Project.objects.all())
        clear_current_tenant()
        
        # Should only contain org_a's project
        assert all(p.organization_id == org_a.id for p in org_a_projects)

    @pytest.mark.django_db
    def test_all_objects_manager_respects_tenant(self, db, org_a, org_b, project_a, project_b):
        """Verify all_objects manager also filters by tenant."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Soft delete project_a
        project_a.soft_delete()
        
        # all_objects should show deleted items but still filter by tenant
        set_current_tenant(org_a)
        org_a_all = list(Project.all_objects.all())
        clear_current_tenant()
        
        # Should only contain org_a's project (even deleted)
        assert len(org_a_all) == 1
        assert org_a_all[0].id == project_a.id


class TestNoTenantContext:
    """Test behavior when no tenant context is set."""

    @pytest.mark.django_db
    def test_request_without_org_header_returns_error(self, api_client, user_a_owner):
        """Verify request without X-Organization-Slug header fails appropriately."""
        from tests.conftest import get_jwt_token
        
        token = get_jwt_token(user_a_owner)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        # No X-Organization-Slug header
        
        response = api_client.get('/api/projects/')
        # Should fail because tenant is required
        assert response.status_code in [401, 403, 404], (
            f"Expected auth failure, got {response.status_code}"
        )
