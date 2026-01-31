from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone
from django.contrib.auth.hashers import make_password

from .models import APIKey, set_current_tenant


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
            api_key = APIKey.objects.select_related('organization', 'created_by').get(
                key_hash=make_password(raw_key),
                organization__slug=org_slug,
                is_active=True
            )
        except APIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid API key')
        
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])
        
        set_current_tenant(api_key.organization)
        request.tenant = api_key.organization
        
        return (api_key.created_by, api_key)

    def authenticate_header(self, request):
        return 'Api-Key'

