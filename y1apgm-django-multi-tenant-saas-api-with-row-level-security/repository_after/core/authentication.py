from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone

from .models import APIKey, Organization, OrganizationMembership, set_current_tenant, set_current_user


class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Api-Key '):
            return None
        
        raw_key = auth_header.split(' ')[1]
        org_slug = request.META.get('HTTP_X_ORGANIZATION_SLUG')
        
        if not org_slug:
            raise AuthenticationFailed('X-Organization-Slug header required')
        
        try:
            organization = Organization.all_objects.get(slug=org_slug, is_deleted=False)
        except Organization.DoesNotExist:
            raise AuthenticationFailed('Invalid organization')
        
        # Iterate through all active API keys and use check_password
        # because make_password generates different hashes for the same input
        api_keys = APIKey.objects.filter(
            organization=organization,
            is_active=True
        ).select_related('organization', 'created_by')
        
        matched_api_key = None
        for api_key in api_keys:
            if api_key.check_key(raw_key):
                matched_api_key = api_key
                break
        
        if not matched_api_key:
            raise AuthenticationFailed('Invalid API key')
        
        matched_api_key.last_used_at = timezone.now()
        matched_api_key.save(update_fields=['last_used_at'])
        
        set_current_tenant(matched_api_key.organization)
        request.tenant = matched_api_key.organization
        request.api_key = matched_api_key
        
        if matched_api_key.created_by:
            set_current_user(matched_api_key.created_by)
        
        return (matched_api_key.created_by, matched_api_key)

    def authenticate_header(self, request):
        return 'Api-Key'
