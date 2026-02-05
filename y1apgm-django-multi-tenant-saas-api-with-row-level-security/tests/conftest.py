"""
Pytest configuration and fixtures for multi-tenant Django API tests.

These tests are designed to run against both repository_before and repository_after.
The TARGET_REPOSITORY environment variable determines which repository to test.
The PYTHONPATH should be set to the target repository directory.
"""
import os
import sys
from pathlib import Path

import pytest


@pytest.fixture(scope='session')
def django_db_setup(django_db_blocker):
    """Create database tables before running tests."""
    from django.core.management import call_command
    
    with django_db_blocker.unblock():
        call_command('migrate', '--run-syncdb', verbosity=0)


@pytest.fixture
def api_client():
    """Create a DRF API client."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def org_a(db):
    """Create Organization A for testing."""
    from core.models import Organization
    return Organization.objects.create(
        name='Organization A',
        slug='org-a',
        plan='professional'
    )


@pytest.fixture
def org_b(db):
    """Create Organization B for testing."""
    from core.models import Organization
    return Organization.objects.create(
        name='Organization B',
        slug='org-b',
        plan='starter'
    )


@pytest.fixture
def user_a_owner(db, org_a):
    """Create an owner user for Organization A."""
    from core.models import User, OrganizationMembership
    user = User.objects.create_user(
        email='owner@org-a.com',
        password='testpass123',
        name='Owner A'
    )
    OrganizationMembership.objects.create(
        user=user,
        organization=org_a,
        role='owner'
    )
    return user


@pytest.fixture
def user_a_admin(db, org_a):
    """Create an admin user for Organization A."""
    from core.models import User, OrganizationMembership
    user = User.objects.create_user(
        email='admin@org-a.com',
        password='testpass123',
        name='Admin A'
    )
    OrganizationMembership.objects.create(
        user=user,
        organization=org_a,
        role='admin'
    )
    return user


@pytest.fixture
def user_a_member(db, org_a):
    """Create a member user for Organization A."""
    from core.models import User, OrganizationMembership
    user = User.objects.create_user(
        email='member@org-a.com',
        password='testpass123',
        name='Member A'
    )
    OrganizationMembership.objects.create(
        user=user,
        organization=org_a,
        role='member'
    )
    return user


@pytest.fixture
def user_a_viewer(db, org_a):
    """Create a viewer user for Organization A."""
    from core.models import User, OrganizationMembership
    user = User.objects.create_user(
        email='viewer@org-a.com',
        password='testpass123',
        name='Viewer A'
    )
    OrganizationMembership.objects.create(
        user=user,
        organization=org_a,
        role='viewer'
    )
    return user


@pytest.fixture
def user_b_owner(db, org_b):
    """Create an owner user for Organization B."""
    from core.models import User, OrganizationMembership
    user = User.objects.create_user(
        email='owner@org-b.com',
        password='testpass123',
        name='Owner B'
    )
    OrganizationMembership.objects.create(
        user=user,
        organization=org_b,
        role='owner'
    )
    return user


@pytest.fixture
def project_a(db, org_a, user_a_owner):
    """Create a project in Organization A."""
    from core.models import Project, set_current_tenant
    set_current_tenant(org_a)
    project = Project.objects.create(
        name='Project Alpha',
        description='Test project for Org A',
        status='active',
        organization=org_a,
        owner=user_a_owner
    )
    set_current_tenant(None)
    return project


@pytest.fixture
def project_b(db, org_b, user_b_owner):
    """Create a project in Organization B."""
    from core.models import Project, set_current_tenant
    set_current_tenant(org_b)
    project = Project.objects.create(
        name='Project Beta',
        description='Test project for Org B',
        status='active',
        organization=org_b,
        owner=user_b_owner
    )
    set_current_tenant(None)
    return project


@pytest.fixture
def task_a(db, org_a, project_a, user_a_member):
    """Create a task in Organization A."""
    from core.models import Task, set_current_tenant
    set_current_tenant(org_a)
    task = Task.objects.create(
        title='Task Alpha',
        description='Test task for Org A',
        status='todo',
        priority='high',
        project=project_a,
        organization=org_a,
        assignee=user_a_member
    )
    set_current_tenant(None)
    return task


@pytest.fixture
def task_b(db, org_b, project_b, user_b_owner):
    """Create a task in Organization B."""
    from core.models import Task, set_current_tenant
    set_current_tenant(org_b)
    task = Task.objects.create(
        title='Task Beta',
        description='Test task for Org B',
        status='todo',
        priority='medium',
        project=project_b,
        organization=org_b,
        assignee=user_b_owner
    )
    set_current_tenant(None)
    return task


@pytest.fixture
def api_key_a(db, org_a, user_a_owner):
    """Create an API key for Organization A."""
    from core.models import APIKey
    api_key = APIKey(
        name='Test API Key A',
        organization=org_a,
        created_by=user_a_owner,
        is_active=True
    )
    raw_key = APIKey.generate_key()
    api_key.set_key(raw_key)
    api_key.save()
    # Store raw key for use in tests
    api_key._raw_key = raw_key
    return api_key


def get_jwt_token(user):
    """Generate JWT token for a user."""
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


@pytest.fixture
def auth_client_owner_a(api_client, user_a_owner, org_a):
    """Create authenticated API client for Organization A owner."""
    token = get_jwt_token(user_a_owner)
    api_client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {token}',
        HTTP_X_ORGANIZATION_SLUG=org_a.slug
    )
    return api_client


@pytest.fixture
def auth_client_admin_a(user_a_admin, org_a):
    """Create authenticated API client for Organization A admin."""
    from rest_framework.test import APIClient
    client = APIClient()
    token = get_jwt_token(user_a_admin)
    client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {token}',
        HTTP_X_ORGANIZATION_SLUG=org_a.slug
    )
    return client


@pytest.fixture
def auth_client_member_a(user_a_member, org_a):
    """Create authenticated API client for Organization A member."""
    from rest_framework.test import APIClient
    client = APIClient()
    token = get_jwt_token(user_a_member)
    client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {token}',
        HTTP_X_ORGANIZATION_SLUG=org_a.slug
    )
    return client


@pytest.fixture
def auth_client_viewer_a(user_a_viewer, org_a):
    """Create authenticated API client for Organization A viewer."""
    from rest_framework.test import APIClient
    client = APIClient()
    token = get_jwt_token(user_a_viewer)
    client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {token}',
        HTTP_X_ORGANIZATION_SLUG=org_a.slug
    )
    return client


@pytest.fixture
def auth_client_owner_b(user_b_owner, org_b):
    """Create authenticated API client for Organization B owner."""
    from rest_framework.test import APIClient
    client = APIClient()
    token = get_jwt_token(user_b_owner)
    client.credentials(
        HTTP_AUTHORIZATION=f'Bearer {token}',
        HTTP_X_ORGANIZATION_SLUG=org_b.slug
    )
    return client


@pytest.fixture
def api_key_client_a(api_key_a, org_a):
    """Create API client authenticated with API key for Organization A."""
    from rest_framework.test import APIClient
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f'Api-Key {api_key_a._raw_key}',
        HTTP_X_ORGANIZATION_SLUG=org_a.slug
    )
    return client
