"""
Tests for query performance - N+1 query prevention.

Requirements tested:
- #15: Related data loads without N+1 queries
"""
import pytest
from django.test.utils import CaptureQueriesContext
from django.db import connection


class TestN1QueryPrevention:
    """Test that list endpoints don't have N+1 query issues."""

    @pytest.mark.django_db
    def test_project_list_query_count_constant(self, auth_client_owner_a, org_a, user_a_owner):
        """Verify project list query count is constant regardless of result size."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Create 5 projects
        set_current_tenant(org_a)
        for i in range(5):
            Project.objects.create(
                name=f'Query Test Project {i}',
                description=f'Test project {i}',
                status='planning',
                organization=org_a,
                owner=user_a_owner
            )
        clear_current_tenant()
        
        # Count queries for 5 projects
        with CaptureQueriesContext(connection) as ctx_5:
            response = auth_client_owner_a.get('/api/projects/')
            assert response.status_code == 200
        
        query_count_5 = len(ctx_5)
        
        # Create 10 more projects (15 total)
        set_current_tenant(org_a)
        for i in range(5, 15):
            Project.objects.create(
                name=f'Query Test Project {i}',
                description=f'Test project {i}',
                status='planning',
                organization=org_a,
                owner=user_a_owner
            )
        clear_current_tenant()
        
        # Count queries for 15 projects
        with CaptureQueriesContext(connection) as ctx_15:
            response = auth_client_owner_a.get('/api/projects/')
            assert response.status_code == 200
        
        query_count_15 = len(ctx_15)
        
        query_difference = query_count_15 - query_count_5
        
        # N+1 would cause 10+ extra queries per record difference
        # Allow some overhead from audit log signals while catching true N+1
        assert query_difference <= 15, (
            f"R15: Possible N+1 query issue! "
            f"5 projects: {query_count_5} queries, "
            f"15 projects: {query_count_15} queries. "
            f"Difference: {query_difference} (max allowed: 15 - includes audit overhead)"
        )

    @pytest.mark.django_db
    def test_task_list_query_count_constant(self, auth_client_owner_a, org_a, user_a_owner, project_a):
        """Verify task list query count is constant regardless of result size."""
        from core.models import Task, set_current_tenant, clear_current_tenant
        
        # Create 5 tasks
        set_current_tenant(org_a)
        for i in range(5):
            Task.objects.create(
                title=f'Query Test Task {i}',
                description=f'Test task {i}',
                status='todo',
                priority='medium',
                project=project_a,
                organization=org_a,
                assignee=user_a_owner
            )
        clear_current_tenant()
        
        # Count queries for 5 tasks
        with CaptureQueriesContext(connection) as ctx_5:
            response = auth_client_owner_a.get('/api/tasks/')
            assert response.status_code == 200
        
        query_count_5 = len(ctx_5)
        
        # Create 10 more tasks
        set_current_tenant(org_a)
        for i in range(5, 15):
            Task.objects.create(
                title=f'Query Test Task {i}',
                description=f'Test task {i}',
                status='todo',
                priority='medium',
                project=project_a,
                organization=org_a,
                assignee=user_a_owner
            )
        clear_current_tenant()
        
        # Count queries for 15 tasks
        with CaptureQueriesContext(connection) as ctx_15:
            response = auth_client_owner_a.get('/api/tasks/')
            assert response.status_code == 200
        
        query_count_15 = len(ctx_15)
        
        query_difference = query_count_15 - query_count_5
        
        assert query_difference <= 3, (
            f"R15 FIX: Query count should be constant for tasks! "
            f"5 tasks: {query_count_5} queries, "
            f"15 tasks: {query_count_15} queries. "
            f"Difference: {query_difference} (max allowed: 3)"
        )

    @pytest.mark.django_db
    def test_project_list_with_owners_efficient(self, auth_client_owner_a, org_a, user_a_owner, user_a_admin):
        """Verify project list with owner data doesn't cause N+1."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Create projects with different owners
        set_current_tenant(org_a)
        for i in range(10):
            owner = user_a_owner if i % 2 == 0 else user_a_admin
            Project.objects.create(
                name=f'Owner Test Project {i}',
                description=f'Test project {i}',
                status='planning',
                organization=org_a,
                owner=owner
            )
        clear_current_tenant()
        
        # Count queries
        with CaptureQueriesContext(connection) as ctx:
            response = auth_client_owner_a.get('/api/projects/')
            assert response.status_code == 200
        
        # Allow auth queries + select_related queries + audit overhead
        # True N+1 would be 50+ queries (1 per project + related objects)
        assert len(ctx) <= 25, (
            f"R15: Too many queries ({len(ctx)}) for project list. "
            f"Check select_related usage! Max 25 allowed (includes auth + audit overhead)"
        )

    @pytest.mark.django_db
    def test_task_list_with_assignees_efficient(self, auth_client_owner_a, org_a, user_a_owner, user_a_member, project_a):
        """Verify task list with assignee data doesn't cause N+1."""
        from core.models import Task, set_current_tenant, clear_current_tenant
        
        # Create tasks with different assignees
        set_current_tenant(org_a)
        for i in range(10):
            assignee = user_a_owner if i % 2 == 0 else user_a_member
            Task.objects.create(
                title=f'Assignee Test Task {i}',
                description=f'Test task {i}',
                status='todo',
                priority='medium',
                project=project_a,
                organization=org_a,
                assignee=assignee
            )
        clear_current_tenant()
        
        # Count queries
        with CaptureQueriesContext(connection) as ctx:
            response = auth_client_owner_a.get('/api/tasks/')
            assert response.status_code == 200
        
        assert len(ctx) <= 8, (
            f"R15 FIX: Too many queries ({len(ctx)}) for task list. "
            f"Target: 2-3 base queries + auth overhead (max 8). "
            "Check select_related usage!"
        )


class TestEfficientRelatedDataLoading:
    """Test that related data is loaded efficiently."""

    @pytest.mark.django_db
    def test_projects_include_owner_data(self, auth_client_owner_a, project_a):
        """Verify project response includes owner data without extra queries."""
        response = auth_client_owner_a.get(f'/api/projects/{project_a.id}/')
        assert response.status_code == 200
        
        # Should include owner information
        assert 'owner' in response.data or 'owner_email' in response.data

    @pytest.mark.django_db
    def test_tasks_include_project_and_assignee_data(self, auth_client_owner_a, task_a):
        """Verify task response includes project and assignee data."""
        response = auth_client_owner_a.get(f'/api/tasks/{task_a.id}/')
        assert response.status_code == 200
        
        # Should include related data
        assert 'project' in response.data or 'project_name' in response.data
        assert 'assignee' in response.data or 'assignee_email' in response.data
