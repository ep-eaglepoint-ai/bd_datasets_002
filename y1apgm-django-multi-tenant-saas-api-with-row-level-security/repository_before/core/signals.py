from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from .models import Project, Task, AuditLog, get_current_tenant


@receiver(post_save, sender=Project)
@receiver(post_save, sender=Task)
def log_model_save(sender, instance, created, **kwargs):
    tenant = get_current_tenant()
    if not tenant:
        tenant = instance.organization

    action = 'create' if created else 'update'

    AuditLog.objects.create(
        organization=tenant,
        user=None,
        action=action,
        model_name=sender.__name__,
        object_id=instance.id,
        object_repr=str(instance),
        changes={}
    )


@receiver(pre_delete, sender=Project)
@receiver(pre_delete, sender=Task)
def log_model_delete(sender, instance, **kwargs):
    tenant = get_current_tenant()
    if not tenant:
        tenant = instance.organization

    AuditLog.objects.create(
        organization=tenant,
        user=None,
        action='delete',
        model_name=sender.__name__,
        object_id=instance.id,
        object_repr=str(instance),
        changes={}
    )

