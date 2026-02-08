"""Content Engine App Configuration."""
from django.apps import AppConfig


class ContentEngineConfig(AppConfig):
    """Configuration for the Content Engine app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'content_engine'
    verbose_name = 'Atomic Versioned Content Engine'
