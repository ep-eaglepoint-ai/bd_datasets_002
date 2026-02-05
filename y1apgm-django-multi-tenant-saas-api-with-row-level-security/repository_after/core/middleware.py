from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import (
    set_current_tenant, clear_current_tenant,
    set_current_user, clear_current_user,
    Organization, OrganizationMembership, APIKey
)


class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.tenant = None
        request.membership = None
        request.api_key = None
        
        if request.path.startswith('/admin/'):
            return
        
        org_slug = request.META.get('HTTP_X_ORGANIZATION_SLUG')
        if not org_slug:
            return
        
        try:
            organization = Organization.all_objects.get(slug=org_slug, is_deleted=False)
        except Organization.DoesNotExist:
            return
        
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            try:
                jwt_auth = JWTAuthentication()
                user, token = jwt_auth.authenticate(request)
                
                if user:
                    membership = OrganizationMembership.objects.filter(
                        user=user,
                        organization=organization
                    ).first()
                    
                    if membership:
                        request.user = user
                        request.tenant = organization
                        request.membership = membership
                        set_current_tenant(organization)
                        set_current_user(user)
                        
                        # Track last_login on successful authentication
                        user.last_login = timezone.now()
                        user.save(update_fields=['last_login'])
            except (AuthenticationFailed, Exception):
                pass
        
        elif auth_header.startswith('Api-Key '):
            raw_key = auth_header.split(' ')[1]
            
            # Must iterate through all active keys and use check_password
            # because make_password generates different hashes each time
            api_keys = APIKey.objects.filter(
                organization=organization,
                is_active=True
            ).select_related('organization', 'created_by')
            
            for api_key in api_keys:
                if api_key.check_key(raw_key):
                    api_key.last_used_at = timezone.now()
                    api_key.save(update_fields=['last_used_at'])
                    
                    request.tenant = organization
                    request.api_key = api_key
                    # Set user to the creator of the API key for audit logging
                    if api_key.created_by:
                        request.user = api_key.created_by
                        set_current_user(api_key.created_by)
                    set_current_tenant(organization)
                    break

    def process_response(self, request, response):
        """Clear tenant and user context after each request to prevent leakage."""
        clear_current_tenant()
        clear_current_user()
        return response
