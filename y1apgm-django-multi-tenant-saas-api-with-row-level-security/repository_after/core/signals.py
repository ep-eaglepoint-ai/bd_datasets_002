from django.db.models.signals import post_save, pre_save, pre_delete
from django.dispatch import receiver

from .models import Project, Task, AuditLog, get_current_tenant, get_current_user

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


@receiver(pre_save, sender=Project)
@receiver(pre_save, sender=Task)
def store_old_values(sender, instance, **kwargs):
    """Store old values before save for change tracking."""
    if instance.pk:
        try:
            # Get the old instance from database
            old_instance = sender.all_objects.get(pk=instance.pk)
            _old_values[f"{sender.__name__}_{instance.pk}"] = get_model_field_values(old_instance)
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender=Project)
@receiver(post_save, sender=Task)
def log_model_save(sender, instance, created, **kwargs):
    """Create audit log entry for create/update operations."""
    tenant = get_current_tenant()
    if not tenant:
        tenant = instance.organization

    user = get_current_user()
    action = 'create' if created else 'update'
    
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
    else:
        # For create, record all field values as new
        new_values = get_model_field_values(instance)
        for field_name, value in new_values.items():
            if value is not None:
                changes[field_name] = {
                    'old': None,
                    'new': value
                }

    AuditLog.objects.create(
        organization=tenant,
        user=user,
        action=action,
        model_name=sender.__name__,
        object_id=instance.id,
        object_repr=str(instance),
        changes=changes
    )


@receiver(pre_delete, sender=Project)
@receiver(pre_delete, sender=Task)
def log_model_delete(sender, instance, **kwargs):
    """Create audit log entry for delete operations."""
    tenant = get_current_tenant()
    if not tenant:
        tenant = instance.organization

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
        organization=tenant,
        user=user,
        action='delete',
        model_name=sender.__name__,
        object_id=instance.id,
        object_repr=str(instance),
        changes=changes
    )
