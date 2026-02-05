"""
Tests for API key authentication.

Requirements tested:
- #2: API key authentication allows service-to-service calls
"""
import pytest


class TestAPIKeyAuthentication:
    """Test API key creation and authentication."""

    @pytest.mark.django_db
    def test_api_key_creation(self, auth_client_owner_a, org_a):
        """Verify API key can be created."""
        response = auth_client_owner_a.post('/api/api-keys/', {
            'name': 'Test Service Key'
        })
        assert response.status_code == 201
        assert 'key' in response.data
        assert 'warning' in response.data
        assert response.data['name'] == 'Test Service Key'

    @pytest.mark.django_db
    def test_api_key_authenticates_successfully(self, api_key_client_a, project_a):
        """Verify API key can authenticate and access resources."""
        response = api_key_client_a.get('/api/projects/')
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. "
            f"API key authentication failed - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_api_key_returns_scoped_data(self, api_key_client_a, project_a, project_b):
        """Verify API key returns data scoped to its organization."""
        response = api_key_client_a.get('/api/projects/')
        assert response.status_code == 200
        
        # Should only see org_a projects
        projects = response.data.get('results', response.data)
        for p in projects:
            assert str(p['id']) == str(project_a.id), (
                f"API key sees wrong project: {p['id']}. "
                "API key data not scoped correctly!"
            )

    @pytest.mark.django_db
    def test_api_key_cannot_access_other_org_data(self, api_key_client_a, project_b):
        """Verify API key cannot access other organization's data."""
        response = api_key_client_a.get(f'/api/projects/{project_b.id}/')
        assert response.status_code == 404, (
            f"Expected 404, got {response.status_code}. "
            "API key can access other org's data - SECURITY VIOLATION!"
        )

    @pytest.mark.django_db
    def test_api_key_can_create_resources(self, api_key_client_a, api_key_a):
        """Verify API key can create resources in its organization."""
        response = api_key_client_a.post('/api/projects/', {
            'name': 'API Created Project',
            'description': 'Created via API key',
            'status': 'planning',
            'owner': str(api_key_a.created_by.id)
        })
        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}. "
            f"API key cannot create resources - Response: {response.data}"
        )

    @pytest.mark.django_db
    def test_invalid_api_key_rejected(self, api_client, org_a):
        """Verify invalid API key is rejected."""
        api_client.credentials(
            HTTP_AUTHORIZATION='Api-Key invalid-key-here',
            HTTP_X_ORGANIZATION_SLUG=org_a.slug
        )
        response = api_client.get('/api/projects/')
        assert response.status_code == 401, (
            f"Expected 401, got {response.status_code}. "
            "Invalid API key not rejected!"
        )

    @pytest.mark.django_db
    def test_api_key_without_org_header_rejected(self, api_key_a, api_client):
        """Verify API key without org header is rejected."""
        api_client.credentials(
            HTTP_AUTHORIZATION=f'Api-Key {api_key_a._raw_key}'
            # No X-Organization-Slug header
        )
        response = api_client.get('/api/projects/')
        assert response.status_code == 401, (
            f"Expected 401, got {response.status_code}. "
            "API key without org header not rejected!"
        )

    @pytest.mark.django_db
    def test_api_key_last_used_updated(self, api_key_client_a, api_key_a, project_a):
        """Verify API key last_used_at is updated on use."""
        from core.models import APIKey
        
        # Get initial last_used_at
        initial_last_used = api_key_a.last_used_at
        
        # Make a request
        response = api_key_client_a.get('/api/projects/')
        assert response.status_code == 200
        
        # Refresh from database
        api_key_a.refresh_from_db()
        
        # last_used_at should be updated
        assert api_key_a.last_used_at is not None
        if initial_last_used:
            assert api_key_a.last_used_at >= initial_last_used

    @pytest.mark.django_db
    def test_disabled_api_key_rejected(self, db, org_a, user_a_owner, api_client):
        """Verify disabled API key is rejected."""
        from core.models import APIKey
        
        # Create a disabled API key
        api_key = APIKey(
            name='Disabled Key',
            organization=org_a,
            created_by=user_a_owner,
            is_active=False
        )
        raw_key = APIKey.generate_key()
        api_key.set_key(raw_key)
        api_key.save()
        
        api_client.credentials(
            HTTP_AUTHORIZATION=f'Api-Key {raw_key}',
            HTTP_X_ORGANIZATION_SLUG=org_a.slug
        )
        response = api_client.get('/api/projects/')
        assert response.status_code == 401, (
            f"Expected 401, got {response.status_code}. "
            "Disabled API key not rejected!"
        )


class TestAPIKeyWrongOrganization:
    """Test API key behavior with wrong organization."""

    @pytest.mark.django_db
    def test_api_key_wrong_org_header_rejected(self, api_key_a, org_b, api_client):
        """Verify API key with wrong org header is rejected."""
        # Use org_a's API key with org_b's slug
        api_client.credentials(
            HTTP_AUTHORIZATION=f'Api-Key {api_key_a._raw_key}',
            HTTP_X_ORGANIZATION_SLUG=org_b.slug
        )
        response = api_client.get('/api/projects/')
        assert response.status_code == 401, (
            f"Expected 401, got {response.status_code}. "
            "API key accepted for wrong organization - SECURITY VIOLATION!"
        )
