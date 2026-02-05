from django.db.models.signals import post_save, pre_save, pre_delete
from django.dispatch import receiver

from .models import Project, Task, Organization, User, AuditLog, get_current_tenant, get_current_user

# Store for tracking old values before save
_old_values = {}


def get_model_field_values(instance):
    """Extract field values from a model instance for comparison."""
    values = {}
    for field in instance._meta.fields:
        field_name = field.name
        value = getattr(instance, field_name, None)
        # Convert to string for JSON serialization
        if value is not None:
            if hasattr(value, 'pk'):  # Foreign key - store ID
                values[field_name] = str(value.pk)
            elif hasattr(value, 'isoformat'):  # DateTime
                values[field_name] = value.isoformat()
            else:
                values[field_name] = str(value)
        else:
            values[field_name] = None
    return values


def get_organization_for_audit(instance, sender):
    """Get the organization for audit logging based on model type."""
    tenant = get_current_tenant()
    if tenant:
        return tenant
    
    # For tenant-scoped models
    if hasattr(instance, 'organization'):
        return instance.organization
    
    # For Organization model itself
    if sender == Organization:
        return instance
    
    # For User model, try to get from first membership
    if sender == User:
        membership = instance.memberships.first()
        if membership:
            return membership.organization
    
    return None


@receiver(pre_save, sender=Project)
@receiver(pre_save, sender=Task)
@receiver(pre_save, sender=Organization)
@receiver(pre_save, sender=User)
def store_old_values(sender, instance, **kwargs):
    """Store old values before save for change tracking."""
    if instance.pk:
        try:
            # Get the old instance from database
            if hasattr(sender, 'all_objects'):
                old_instance = sender.all_objects.get(pk=instance.pk)
            else:
                old_instance = sender.objects.get(pk=instance.pk)
            _old_values[f"{sender.__name__}_{instance.pk}"] = get_model_field_values(old_instance)
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender=Project)
@receiver(post_save, sender=Task)
@receiver(post_save, sender=Organization)
@receiver(post_save, sender=User)
def log_model_save(sender, instance, created, **kwargs):
    """Create audit log entry for create/update operations."""
    organization = get_organization_for_audit(instance, sender)
    if not organization:
        return  # Skip if no organization context
    
    user = get_current_user()
    
    changes = {}
    if not created:
        # Calculate changes for update
        key = f"{sender.__name__}_{instance.pk}"
        old_values = _old_values.pop(key, {})
        new_values = get_model_field_values(instance)
        
        for field_name in new_values:
            old_val = old_values.get(field_name)
            new_val = new_values.get(field_name)
            if old_val != new_val:
                changes[field_name] = {
                    'old': old_val,
                    'new': new_val
                }
        
        # Detect soft delete vs regular update
        # If is_deleted changed from False to True, this is a soft_delete
        if 'is_deleted' in changes:
            if changes['is_deleted'].get('old') == 'False' and changes['is_deleted'].get('new') == 'True':
                action = 'soft_delete'
            elif changes['is_deleted'].get('old') == 'True' and changes['is_deleted'].get('new') == 'False':
                action = 'restore'
            else:
                action = 'update'
        else:
            action = 'update'
    else:
        action = 'create'
        # For create, record all field values as new
        new_values = get_model_field_values(instance)
        for field_name, value in new_values.items():
            if value is not None:
                changes[field_name] = {
                    'old': None,
                    'new': value
                }

    AuditLog.objects.create(
        organization=organization,
        user=user,
        action=action,
        model_name=sender.__name__,
        object_id=instance.id,
        object_repr=str(instance),
        changes=changes
    )


@receiver(pre_delete, sender=Project)
@receiver(pre_delete, sender=Task)
@receiver(pre_delete, sender=Organization)
@receiver(pre_delete, sender=User)
def log_model_delete(sender, instance, **kwargs):
    """Create audit log entry for hard delete operations."""
    organization = get_organization_for_audit(instance, sender)
    if not organization:
        return  # Skip if no organization context
    
    user = get_current_user()
    
    # Record all field values being deleted
    changes = {}
    old_values = get_model_field_values(instance)
    for field_name, value in old_values.items():
        if value is not None:
            changes[field_name] = {
                'old': value,
                'new': None
            }

    AuditLog.objects.create(
        organization=organization,
        user=user,
        action='delete',
        model_name=sender.__name__,
        object_id=instance.id,
        object_repr=str(instance),
        changes=changes
    )
