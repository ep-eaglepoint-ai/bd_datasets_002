"""
Tests for application startup and basic functionality.

Requirements tested:
- #1: Application starts successfully
"""
import pytest
import subprocess
import sys
import os
from pathlib import Path


class TestApplicationStartup:
    """Test that the Django application starts successfully."""

    @pytest.mark.django_db
    def test_django_apps_loaded(self):
        """Verify Django apps are properly loaded."""
        from django.apps import apps
        
        # Core app should be loaded
        assert apps.is_installed('core'), "Core app not installed"
        assert apps.is_installed('rest_framework'), "DRF not installed"

    @pytest.mark.django_db
    def test_models_can_be_imported(self):
        """Verify all models can be imported."""
        from core.models import (
            Organization,
            User,
            OrganizationMembership,
            Project,
            Task,
            APIKey,
            AuditLog
        )
        
        # All models should be importable
        assert Organization is not None
        assert User is not None
        assert OrganizationMembership is not None
        assert Project is not None
        assert Task is not None
        assert APIKey is not None
        assert AuditLog is not None

    @pytest.mark.django_db
    def test_views_can_be_imported(self):
        """Verify all views can be imported."""
        from core.views import (
            OrganizationViewSet,
            ProjectViewSet,
            TaskViewSet,
            UserViewSet,
            APIKeyViewSet,
            AuditLogViewSet
        )
        
        assert OrganizationViewSet is not None
        assert ProjectViewSet is not None
        assert TaskViewSet is not None
        assert UserViewSet is not None
        assert APIKeyViewSet is not None
        assert AuditLogViewSet is not None

    @pytest.mark.django_db
    def test_urls_configured(self):
        """Verify URL patterns are configured."""
        from django.urls import reverse
        
        # These should not raise NoReverseMatch
        reverse('project-list')
        reverse('task-list')
        reverse('organization-list')

    @pytest.mark.django_db
    def test_database_tables_exist(self, db):
        """Verify database tables are created."""
        from django.db import connection
        
        tables = connection.introspection.table_names()
        
        # Check for core tables
        expected_tables = ['organizations', 'users', 'projects', 'tasks']
        for table in expected_tables:
            assert table in tables, f"Table {table} not found in database"


class TestBasicAPIEndpoints:
    """Test that basic API endpoints respond correctly."""

    @pytest.mark.django_db
    def test_health_check_unauthenticated(self, api_client):
        """Verify API responds to unauthenticated requests appropriately."""
        response = api_client.get('/api/projects/')
        # Should require authentication
        assert response.status_code in [401, 403], (
            f"Unauthenticated request should be rejected, got {response.status_code}"
        )

    @pytest.mark.django_db
    def test_token_endpoint_exists(self, api_client):
        """Verify JWT token endpoint exists."""
        response = api_client.post('/api/token/', {
            'email': 'nonexistent@test.com',
            'password': 'wrongpassword'
        })
        # Should return 401 for invalid credentials, not 404
        assert response.status_code != 404, "Token endpoint not found"

    @pytest.mark.django_db
    def test_authenticated_request_works(self, auth_client_owner_a, project_a):
        """Verify authenticated requests work correctly."""
        response = auth_client_owner_a.get('/api/projects/')
        assert response.status_code == 200


class TestErrorResponses:
    """Test proper error responses."""

    @pytest.mark.django_db
    def test_404_for_nonexistent_resource(self, auth_client_owner_a):
        """Verify 404 returned for non-existent resources."""
        import uuid
        fake_id = str(uuid.uuid4())
        response = auth_client_owner_a.get(f'/api/projects/{fake_id}/')
        assert response.status_code == 404

    @pytest.mark.django_db
    def test_400_for_invalid_data(self, auth_client_owner_a):
        """Verify 400 returned for invalid data."""
        response = auth_client_owner_a.post('/api/projects/', {
            # Missing required fields
        })
        assert response.status_code == 400

    @pytest.mark.django_db
    def test_401_for_invalid_token(self, api_client, org_a):
        """Verify 401 returned for invalid token."""
        api_client.credentials(
            HTTP_AUTHORIZATION='Bearer invalid-token',
            HTTP_X_ORGANIZATION_SLUG=org_a.slug
        )
        response = api_client.get('/api/projects/')
        assert response.status_code == 401

    @pytest.mark.django_db
    def test_403_for_unauthorized_action(self, auth_client_viewer_a, org_a):
        """Verify 403 returned for unauthorized actions."""
        response = auth_client_viewer_a.post('/api/projects/', {
            'name': 'Unauthorized Project',
            'description': 'Should fail',
            'status': 'planning'
        })
        assert response.status_code == 403


class TestCRUDOperations:
    """Test basic CRUD operations work correctly."""

    @pytest.mark.django_db
    def test_create_project(self, auth_client_owner_a, user_a_owner):
        """Verify project creation works."""
        response = auth_client_owner_a.post('/api/projects/', {
            'name': 'New Project',
            'description': 'Test project',
            'status': 'planning',
            'owner': str(user_a_owner.id)
        })
        assert response.status_code == 201
        assert response.data['name'] == 'New Project'

    @pytest.mark.django_db
    def test_read_project(self, auth_client_owner_a, project_a):
        """Verify project retrieval works."""
        response = auth_client_owner_a.get(f'/api/projects/{project_a.id}/')
        assert response.status_code == 200
        assert response.data['name'] == project_a.name

    @pytest.mark.django_db
    def test_update_project(self, auth_client_owner_a, project_a):
        """Verify project update works."""
        response = auth_client_owner_a.patch(
            f'/api/projects/{project_a.id}/',
            {'name': 'Updated Name'}
        )
        assert response.status_code == 200
        assert response.data['name'] == 'Updated Name'

    @pytest.mark.django_db
    def test_delete_project(self, auth_client_owner_a, project_a):
        """Verify project deletion works (soft delete)."""
        response = auth_client_owner_a.delete(f'/api/projects/{project_a.id}/')
        assert response.status_code == 204

    @pytest.mark.django_db
    def test_create_task(self, auth_client_member_a, project_a):
        """Verify task creation works."""
        response = auth_client_member_a.post('/api/tasks/', {
            'title': 'New Task',
            'description': 'Test task',
            'project': str(project_a.id),
            'status': 'todo',
            'priority': 'medium'
        })
        assert response.status_code == 201
        assert response.data['title'] == 'New Task'


class TestFilteringAndSearch:
    """Test filtering and search functionality."""

    @pytest.mark.django_db
    def test_filter_projects_by_status(self, auth_client_owner_a, org_a, user_a_owner):
        """Verify projects can be filtered by status."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        set_current_tenant(org_a)
        Project.objects.create(
            name='Active Project',
            status='active',
            organization=org_a,
            owner=user_a_owner
        )
        Project.objects.create(
            name='Planning Project',
            status='planning',
            organization=org_a,
            owner=user_a_owner
        )
        clear_current_tenant()
        
        response = auth_client_owner_a.get('/api/projects/?status=active')
        assert response.status_code == 200
        
        results = response.data.get('results', response.data)
        for project in results:
            assert project['status'] == 'active'

    @pytest.mark.django_db
    def test_search_projects_by_name(self, auth_client_owner_a, org_a, user_a_owner):
        """Verify projects can be searched by name."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        set_current_tenant(org_a)
        Project.objects.create(
            name='Alpha Project',
            status='active',
            organization=org_a,
            owner=user_a_owner
        )
        Project.objects.create(
            name='Beta Project',
            status='active',
            organization=org_a,
            owner=user_a_owner
        )
        clear_current_tenant()
        
        response = auth_client_owner_a.get('/api/projects/?search=Alpha')
        assert response.status_code == 200
        
        results = response.data.get('results', response.data)
        assert len(results) >= 1
        assert any('Alpha' in p['name'] for p in results)
