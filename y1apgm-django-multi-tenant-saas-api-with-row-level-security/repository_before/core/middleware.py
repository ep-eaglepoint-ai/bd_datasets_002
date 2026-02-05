from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import set_current_tenant, Organization, OrganizationMembership


class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.tenant = None
        
        if request.path.startswith('/admin/'):
            return
        
        org_slug = request.META.get('HTTP_X_ORGANIZATION_SLUG')
        if not org_slug:
            return
        
        try:
            organization = Organization.objects.get(slug=org_slug, is_deleted=False)
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
            except (AuthenticationFailed, Exception):
                pass
        
        elif auth_header.startswith('Api-Key '):
            from .models import APIKey
            from django.contrib.auth.hashers import make_password
            
            raw_key = auth_header.split(' ')[1]
            try:
                api_key = APIKey.objects.get(
                    key_hash=make_password(raw_key),
                    organization=organization,
                    is_active=True
                )
                api_key.last_used_at = timezone.now()
                api_key.save(update_fields=['last_used_at'])
                
                request.tenant = organization
                request.api_key = api_key
                set_current_tenant(organization)
            except APIKey.DoesNotExist:
                pass

