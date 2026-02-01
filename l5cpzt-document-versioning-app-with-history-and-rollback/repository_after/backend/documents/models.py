"""Document and DocumentVersion models."""
from django.db import models
from django.contrib.auth.models import User
from django.db.models import Max


class Document(models.Model):
    """Main document model storing current content."""
    
    owner = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='documents'
    )
    title = models.CharField(max_length=255)
    current_content = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Optimistic locking field
    optimistic_version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} (by {self.owner.username})"

    def create_version(self, user, change_note=''):
        """
        Create a new version snapshot of the current document content.
        Version number auto-increments per document.
        Uses select_for_update to prevent race conditions.
        """
        from django.db import transaction

        with transaction.atomic():
            # Lock the document for version generation
            locked_doc = Document.objects.select_for_update().get(pk=self.pk)
            
            # Get the next version number
            max_version = locked_doc.versions.aggregate(Max('version_number'))['version_number__max']
            next_version = (max_version or 0) + 1

            return DocumentVersion.objects.create(
                document=locked_doc,
                version_number=next_version,
                content_snapshot=locked_doc.current_content,
                created_by=user,
                change_note=change_note
            )


class DocumentVersion(models.Model):
    """Document version storing historical snapshots."""
    
    document = models.ForeignKey(
        Document, 
        on_delete=models.CASCADE, 
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    content_snapshot = models.TextField()
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='document_versions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    change_note = models.CharField(max_length=500, blank=True, default='')

    class Meta:
        ordering = ['-version_number']
        unique_together = ['document', 'version_number']

    def __str__(self):
        return f"{self.document.title} - v{self.version_number}"
