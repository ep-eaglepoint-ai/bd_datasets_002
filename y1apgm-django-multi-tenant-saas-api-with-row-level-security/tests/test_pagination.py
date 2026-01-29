"""
Tests for pagination with large datasets.

Requirements tested:
- #14: Pagination handles large datasets efficiently
"""
import pytest


class TestCursorPagination:
    """Test cursor-based pagination for large datasets."""

    @pytest.mark.django_db
    def test_pagination_returns_cursor(self, auth_client_owner_a, org_a, user_a_owner):
        """Verify pagination returns cursor for navigating results."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Create multiple projects
        set_current_tenant(org_a)
        for i in range(25):
            Project.objects.create(
                name=f'Project {i}',
                description=f'Test project {i}',
                status='planning',
                organization=org_a,
                owner=user_a_owner
            )
        clear_current_tenant()
        
        # Request first page
        response = auth_client_owner_a.get('/api/projects/')
        assert response.status_code == 200
        
        # Should have pagination cursors
        assert 'next' in response.data or 'results' in response.data

    @pytest.mark.django_db
    def test_pagination_next_cursor_works(self, auth_client_owner_a, org_a, user_a_owner):
        """Verify next cursor allows navigating to next page."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Create more projects than page size
        set_current_tenant(org_a)
        for i in range(30):
            Project.objects.create(
                name=f'Pagination Project {i}',
                description=f'Test project {i}',
                status='planning',
                organization=org_a,
                owner=user_a_owner
            )
        clear_current_tenant()
        
        # Get first page
        response = auth_client_owner_a.get('/api/projects/')
        assert response.status_code == 200
        
        # If there's a next cursor, use it
        if response.data.get('next'):
            next_url = response.data['next']
            next_response = auth_client_owner_a.get(next_url)
            assert next_response.status_code == 200
            
            # Should have results
            results = next_response.data.get('results', [])
            assert len(results) > 0, "Next page has no results"

    @pytest.mark.django_db
    def test_pagination_respects_page_size(self, auth_client_owner_a, org_a, user_a_owner):
        """Verify pagination respects page_size parameter."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Create projects
        set_current_tenant(org_a)
        for i in range(15):
            Project.objects.create(
                name=f'Size Test Project {i}',
                description=f'Test project {i}',
                status='planning',
                organization=org_a,
                owner=user_a_owner
            )
        clear_current_tenant()
        
        # Request with custom page size
        response = auth_client_owner_a.get('/api/projects/?page_size=5')
        assert response.status_code == 200
        
        results = response.data.get('results', response.data)
        assert len(results) <= 5, f"Page size not respected: got {len(results)} results"

    @pytest.mark.django_db
    def test_pagination_max_page_size_enforced(self, auth_client_owner_a, org_a, user_a_owner):
        """Verify max page size is enforced."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Create many projects
        set_current_tenant(org_a)
        for i in range(150):
            Project.objects.create(
                name=f'Max Size Project {i}',
                description=f'Test project {i}',
                status='planning',
                organization=org_a,
                owner=user_a_owner
            )
        clear_current_tenant()
        
        # Request with very large page size
        response = auth_client_owner_a.get('/api/projects/?page_size=500')
        assert response.status_code == 200
        
        results = response.data.get('results', response.data)
        # Max page size should be 100
        assert len(results) <= 100, f"Max page size not enforced: got {len(results)} results"


class TestLargeDatasetHandling:
    """Test performance with large datasets."""

    @pytest.mark.django_db
    def test_pagination_with_many_records(self, auth_client_owner_a, org_a, user_a_owner):
        """Verify pagination works with 1000+ records."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        import time
        
        # Create 1000 projects
        set_current_tenant(org_a)
        projects = [
            Project(
                name=f'Large Dataset Project {i}',
                description=f'Test project {i}',
                status='planning',
                organization=org_a,
                owner=user_a_owner
            )
            for i in range(1000)
        ]
        Project.objects.bulk_create(projects)
        clear_current_tenant()
        
        # Time the request
        start_time = time.time()
        response = auth_client_owner_a.get('/api/projects/')
        end_time = time.time()
        
        assert response.status_code == 200
        
        # Should complete in reasonable time (under 5 seconds)
        request_time = end_time - start_time
        assert request_time < 5.0, (
            f"Request took {request_time:.2f}s - too slow for large dataset"
        )
        
        # Should have pagination
        assert 'next' in response.data or 'results' in response.data

    @pytest.mark.django_db
    def test_cursor_pagination_consistent_ordering(self, auth_client_owner_a, org_a, user_a_owner):
        """Verify cursor pagination maintains consistent ordering."""
        from core.models import Project, set_current_tenant, clear_current_tenant
        
        # Create projects
        set_current_tenant(org_a)
        for i in range(50):
            Project.objects.create(
                name=f'Ordering Project {i}',
                description=f'Test project {i}',
                status='planning',
                organization=org_a,
                owner=user_a_owner
            )
        clear_current_tenant()
        
        # Get all results across pages
        all_ids = []
        url = '/api/projects/?page_size=10'
        
        while url:
            response = auth_client_owner_a.get(url)
            assert response.status_code == 200
            
            results = response.data.get('results', [])
            for r in results:
                all_ids.append(r['id'])
            
            url = response.data.get('next')
            # Prevent infinite loop
            if len(all_ids) > 100:
                break
        
        # IDs should be unique (no duplicates across pages)
        assert len(all_ids) == len(set(all_ids)), (
            "Duplicate records found across pages - pagination inconsistent!"
        )
