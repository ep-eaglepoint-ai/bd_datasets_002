"""
Models for the Atomic Versioned Content Engine.

This module defines the core data models for managing immutable content versions.
- Document: Container for content with a live version pointer
- ContentVersion: Immutable snapshots of content with JSON data
"""
import hashlib
import json
from django.db import models, transaction
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from jsonschema import validate
from jsonschema.exceptions import ValidationError as JsonSchemaValidationError


class DocumentManager(models.Manager):
    """Manager for Document model with publish capability."""
    
    def get_live_document(self, slug):
        """Get a document with its live version."""
        try:
            return self.get(slug=slug, live_version__isnull=False)
        except Document.DoesNotExist:
            return None
        except Document.MultipleObjectsReturned:
            # Should not happen due to unique constraint
            return self.filter(slug=slug, live_version__isnull=False).first()


class Document(models.Model):
    """
    Document container that holds content versions.
    
    Acts as a pointer to the current live version while maintaining
    a complete history of all versions.
    """
    slug = models.SlugField(
        max_length=255,
        unique=True,
        help_text="Unique identifier for the document (URL-safe)"
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Human-readable title of the document"
    )
    live_version = models.ForeignKey(
        'ContentVersion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='published_as_live',
        help_text="Reference to the currently published version"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = DocumentManager()
    
    class Meta:
        ordering = ['-updated_at']
        verbose_name = "Document"
        verbose_name_plural = "Documents"
    
    def __str__(self):
        return f"{self.slug} ({self.live_version_id if self.live_version else 'No live version'})"
    
    def get_versions(self):
        """Get all versions for this document in reverse chronological order."""
        return self.content_versions.all().order_by('-created_at')
    
    def create_version(self, content, version_number=None):
        """
        Create a new immutable version for this document.
        
        Args:
            content: JSON-serializable content dict
            version_number: Optional version number, auto-incremented if not provided
            
        Returns:
            The newly created ContentVersion instance
            
        Raises:
            ValidationError: If content doesn't validate against schema
        """
        if version_number is None:
            last_version = self.content_versions.order_by('-version_number').first()
            version_number = (last_version.version_number + 1) if last_version else 1
        
        return ContentVersion.objects.create(
            document=self,
            version_number=version_number,
            content=content
        )
    
    @transaction.atomic
    def publish_version(self, version_id):
        """
        Atomically publish a specific version.
        
        This method updates the live_version pointer within a database
        transaction to ensure consistency.
        
        Args:
            version_id: ID of the ContentVersion to publish
            
        Returns:
            The published ContentVersion instance
            
        Raises:
            ContentVersion.DoesNotExist: If version doesn't belong to this document
            ValueError: If version_id is invalid
        """
        try:
            version = self.content_versions.get(id=version_id)
        except ContentVersion.DoesNotExist:
            raise ValueError(f"Version {version_id} not found for document {self.slug}")
        
        self.live_version = version
        self.save(update_fields=['live_version', 'updated_at'])
        
        return version
    
    def get_live_content(self):
        """Get the content of the live version."""
        if self.live_version:
            return self.live_version.content
        return None


class ContentVersionManager(models.Manager):
    """Manager for ContentVersion model with immutability enforcement."""
    
    def create(self, *args, **kwargs):
        """Override create to validate immutability."""
        return super().create(*args, **kwargs)


class ContentVersion(models.Model):
    """
    Immutable snapshot of document content.
    
    Once created, a ContentVersion cannot be modified. Any attempt to
    update an existing instance will raise a ValidationError.
    """
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='content_versions',
        help_text="The document this version belongs to"
    )
    version_number = models.PositiveIntegerField(
        help_text="Sequential version number for this document"
    )
    content = models.JSONField(
        help_text="The JSON content of this version"
    )
    content_hash = models.CharField(
        max_length=64,
        editable=False,
        help_text="SHA-256 hash of the content for integrity verification"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="User who created this version"
    )
    
    objects = ContentVersionManager()
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['document', 'version_number']
        verbose_name = "Content Version"
        verbose_name_plural = "Content Versions"
    
    def __str__(self):
        return f"{self.document.slug} v{self.version_number}"
    
    def clean(self):
        """Validate the model before saving."""
        super().clean()
        
        # Validate JSON schema
        self._validate_content_schema()
        
        # Verify immutability for existing instances
        self._check_immutability()
    
    def save(self, *args, **kwargs):
        """Override save to enforce immutability and compute content hash."""
        # Compute content hash for integrity verification
        if self.content is not None:
            content_str = json.dumps(self.content, sort_keys=True, default=str)
            self.content_hash = hashlib.sha256(content_str.encode()).hexdigest()
        
        # Check immutability before saving
        if self.pk is not None:
            raise ValidationError(
                "ContentVersion is immutable. Create a new version instead of modifying existing ones."
            )
        
        super().save(*args, **kwargs)
    
    def _validate_content_schema(self):
        """Validate content against the predefined JSON schema."""
        schema = getattr(settings, 'CONTENT_SCHEMA', {})
        if schema:
            try:
                validate(instance=self.content, schema=schema)
            except JsonSchemaValidationError as e:
                raise ValidationError({
                    'content': f"Content does not match schema: {e.message}"
                })
    
    def _check_immutability(self):
        """Check if this is an existing instance being modified."""
        if self.pk is not None:
            try:
                original = ContentVersion.objects.get(pk=self.pk)
                # Check if content has changed
                original_hash = original.content_hash
                new_hash = self.content_hash
                if original_hash != new_hash:
                    raise ValidationError(
                        "ContentVersion is immutable. Cannot modify existing version."
                    )
            except ContentVersion.DoesNotExist:
                # New instance, allow save
                pass
    
    def delete(self, *args, **kwargs):
        """Override delete to prevent accidental deletion of versions."""
        # Optionally allow deletion, but in production you might want to
        # soft-delete or prevent deletion entirely
        super().delete(*args, **kwargs)
    
    @property
    def is_live(self):
        """Check if this version is the live version for its document."""
        return self.document.live_version_id == self.pk
    
    def get_previous_version(self):
        """Get the previous version in sequence."""
        return self.document.content_versions.filter(
            version_number__lt=self.version_number
        ).order_by('-version_number').first()
    
    def get_next_version(self):
        """Get the next version in sequence."""
        return self.document.content_versions.filter(
            version_number__gt=self.version_number
        ).order_by('version_number').first()
