"""
Tests for the Atomic Versioned Content Engine.

These tests verify:
1. Multiple saves for the same document result in multiple unique Version records
2. Attempting to update an existing Version record fails (immutability)
3. The Public View output remains unchanged when new versions are added until the 'Publish' pointer is updated
4. Deleting a Document removes all associated Versions via cascaded delete
"""
import json
import pytest
from django.test import TestCase, Client
from django.core.exceptions import ValidationError
from django.db import transaction

from content_engine.models import Document, ContentVersion


@pytest.mark.django_db
class TestDocumentModel:
    """Test cases for the Document model."""
    
    def test_create_document(self):
        """Test creating a new document."""
        doc = Document.objects.create(slug="test-document", title="Test Document")
        assert doc.pk is not None
        assert doc.slug == "test-document"
        assert doc.title == "Test Document"
        assert doc.live_version is None
        assert doc.created_at is not None
    
    def test_document_unique_slug(self):
        """Test that document slugs must be unique."""
        Document.objects.create(slug="unique-slug", title="First")
        
        with pytest.raises(Exception):  # IntegrityError
            Document.objects.create(slug="unique-slug", title="Second")
    
    def test_document_str_representation(self):
        """Test string representation of document."""
        doc = Document.objects.create(slug="my-doc")
        assert "my-doc" in str(doc)


@pytest.mark.django_db
class TestContentVersionModel:
    """Test cases for the ContentVersion model."""
    
    def test_create_version(self):
        """Test creating a new content version."""
        doc = Document.objects.create(slug="test-doc")
        content = {"title": "Hello World", "body": "Content here"}
        
        version = ContentVersion.objects.create(
            document=doc,
            version_number=1,
            content=content
        )
        
        assert version.pk is not None
        assert version.version_number == 1
        assert version.content == content
        assert version.content_hash is not None
        assert len(version.content_hash) == 64  # SHA-256 hex
    
    def test_version_auto_increment(self):
        """Test that version numbers auto-increment."""
        doc = Document.objects.create(slug="auto-doc")
        
        v1 = doc.create_version({"title": "V1"})
        v2 = doc.create_version({"title": "V2"})
        v3 = doc.create_version({"title": "V3"})
        
        assert v1.version_number == 1
        assert v2.version_number == 2
        assert v3.version_number == 3
    
    def test_immutability_prevents_update(self):
        """Test that updating an existing version raises ValidationError."""
        doc = Document.objects.create(slug="immutability-test")
        version = doc.create_version({"title": "Original"})
        
        # Try to modify the content
        version.content = {"title": "Modified"}
        
        with pytest.raises(ValidationError) as exc_info:
            version.save()
        
        assert "immutable" in str(exc_info.value).lower()
    
    def test_immutability_prevents_save_on_existing_instance(self):
        """Test that calling save() on existing instance raises error."""
        doc = Document.objects.create(slug="save-test")
        version = doc.create_version({"title": "Test"})
        
        # Attempt to re-save the same instance
        with pytest.raises(ValidationError):
            version.save()


@pytest.mark.django_db
class TestVersionImmutability:
    """Tests specifically for immutability enforcement."""
    
    def test_cannot_modify_content(self):
        """Verify that content cannot be modified after creation."""
        doc = Document.objects.create(slug="modify-test")
        version = doc.create_version({"title": "Original", "body": "Content"})
        original_hash = version.content_hash
        
        # Modify the content dict directly
        version.content["title"] = "Modified"
        
        # Try to save
        with pytest.raises(ValidationError):
            version.save()
        
        # Verify the database still has original
        version.refresh_from_db()
        assert version.content["title"] == "Original"
        assert version.content_hash == original_hash
    
    def test_cannot_change_version_number(self):
        """Verify that version_number cannot be changed after creation."""
        doc = Document.objects.create(slug="version-change-test")
        version = doc.create_version({"title": "Test"})
        
        # Try to change version number
        version.version_number = 999
        
        with pytest.raises(ValidationError):
            version.save()
        
        # Verify the database still has original
        version.refresh_from_db()
        assert version.version_number == 1


@pytest.mark.django_db
class TestMultipleVersions:
    """Test creating multiple versions for a document."""
    
    def test_multiple_saves_create_multiple_versions(self):
        """Test that multiple saves result in multiple version records."""
        doc = Document.objects.create(slug="multi-save-test")
        
        # Create multiple versions
        v1 = doc.create_version({"title": "Version 1", "body": "Content 1"})
        v2 = doc.create_version({"title": "Version 2", "body": "Content 2"})
        v3 = doc.create_version({"title": "Version 3", "body": "Content 3"})
        
        # Verify all versions exist
        assert ContentVersion.objects.filter(document=doc).count() == 3
        
        # Verify each is a separate record
        assert v1.pk != v2.pk != v3.pk
        assert v1.pk != v3.pk
        
        # Verify content differs
        assert v1.content["title"] == "Version 1"
        assert v2.content["title"] == "Version 2"
        assert v3.content["title"] == "Version 3"
    
    def test_versions_ordered_reverse_chronologically(self):
        """Test that versions are returned in reverse chronological order."""
        doc = Document.objects.create(slug="order-test")
        
        v1 = doc.create_version({"title": "V1"})
        v2 = doc.create_version({"title": "V2"})
        v3 = doc.create_version({"title": "V3"})
        
        versions = list(doc.get_versions())
        
        assert versions[0].version_number == 3
        assert versions[1].version_number == 2
        assert versions[2].version_number == 1


@pytest.mark.django_db
class TestAtomicPromotion:
    """Test the atomic publish/promotion mechanism."""
    
    def test_publish_version(self):
        """Test publishing a specific version."""
        doc = Document.objects.create(slug="publish-test")
        version = doc.create_version({"title": "Live Content"})
        
        # Publish the version
        doc.publish_version(version.id)
        
        # Verify live_version is set
        doc.refresh_from_db()
        assert doc.live_version == version
        assert doc.live_version_id == version.id
    
    def test_publish_updates_live_pointer(self):
        """Test that publishing updates the live pointer atomically."""
        doc = Document.objects.create(slug="pointer-test")
        v1 = doc.create_version({"title": "Version 1"})
        v2 = doc.create_version({"title": "Version 2"})
        v3 = doc.create_version({"title": "Version 3"})
        
        # Initially publish v1
        doc.publish_version(v1.id)
        assert doc.live_version == v1
        
        # Update to v2
        doc.publish_version(v2.id)
        doc.refresh_from_db()
        assert doc.live_version == v2
        assert doc.live_version_id == v2.id
        
        # Update to v3
        doc.publish_version(v3.id)
        doc.refresh_from_db()
        assert doc.live_version == v3
    
    def test_publish_invalid_version_raises_error(self):
        """Test that publishing a non-existent version raises an error."""
        doc = Document.objects.create(slug="invalid-publish-test")
        
        with pytest.raises(ValueError):
            doc.publish_version(99999)  # Non-existent ID
    
    def test_publish_version_belongs_to_different_document(self):
        """Test that publishing a version from a different document fails."""
        doc1 = Document.objects.create(slug="doc1")
        doc2 = Document.objects.create(slug="doc2")
        
        version1 = doc1.create_version({"title": "V1"})
        
        # Try to publish doc1's version on doc2
        with pytest.raises(ValueError):
            doc2.publish_version(version1.id)


@pytest.mark.django_db
class TestPublicAPIView:
    """Test the public read-only API view."""
    
    def test_public_view_returns_404_when_no_document(self):
        """Test that public view returns 404 for non-existent document."""
        client = Client()
        response = client.get('/api/public/nonexistent/')
        assert response.status_code == 404
    
    def test_public_view_returns_404_when_no_live_version(self):
        """Test that public view returns 404 when document exists but no live version."""
        client = Client()
        doc = Document.objects.create(slug="draft-only")
        doc.create_version({"title": "Draft"})
        
        response = client.get('/api/public/draft-only/')
        assert response.status_code == 404
    
    def test_public_view_returns_live_content(self):
        """Test that public view returns content of live version."""
        client = Client()
        doc = Document.objects.create(slug="published-doc")
        version = doc.create_version({"title": "Published", "body": "Live content"})
        doc.publish_version(version.id)
        
        response = client.get('/api/public/published-doc/')
        assert response.status_code == 200
        
        data = response.json()
        assert data['slug'] == 'published-doc'
        assert data['content']['title'] == 'Published'
        assert data['content']['body'] == 'Live content'
        assert data['version_number'] == 1
    
    def test_public_view_unchanged_until_published(self):
        """Test that public view remains unchanged until version is published."""
        client = Client()
        doc = Document.objects.create(slug="change-test")
        
        # Create version 1 and publish it
        v1 = doc.create_version({"title": "Version 1"})
        doc.publish_version(v1.id)
        
        # Call public view - should return v1
        response1 = client.get('/api/public/change-test/')
        assert response1.json()['version_number'] == 1
        
        # Create version 2 (not published)
        v2 = doc.create_version({"title": "Version 2"})
        
        # Call public view - should still return v1
        response2 = client.get('/api/public/change-test/')
        assert response2.json()['version_number'] == 1
        assert response2.json()['content']['title'] == 'Version 1'
        
        # Publish v2
        doc.publish_version(v2.id)
        
        # Call public view - should now return v2
        response3 = client.get('/api/public/change-test/')
        assert response3.json()['version_number'] == 2
        assert response3.json()['content']['title'] == 'Version 2'


@pytest.mark.django_db
class TestCascadedDelete:
    """Test that deleting a document removes all associated versions."""
    
    def test_delete_document_removes_versions(self):
        """Test cascaded deletion of versions."""
        doc = Document.objects.create(slug="delete-test")
        v1 = doc.create_version({"title": "V1"})
        v2 = doc.create_version({"title": "V2"})
        v3 = doc.create_version({"title": "V3"})
        
        # Verify versions exist
        assert ContentVersion.objects.filter(document=doc).count() == 3
        
        # Delete document
        doc_id = doc.id
        doc.delete()
        
        # Verify all versions are deleted
        assert ContentVersion.objects.filter(document_id=doc_id).count() == 0
    
    def test_delete_version_does_not_affect_document(self):
        """Test that deleting a version doesn't affect the document."""
        doc = Document.objects.create(slug="version-delete-test")
        v1 = doc.create_version({"title": "V1"})
        v2 = doc.create_version({"title": "V2"})
        
        doc_id = doc.id
        v1.delete()
        
        # Document still exists
        assert Document.objects.filter(id=doc_id).exists()
        # Remaining version still exists
        assert ContentVersion.objects.filter(id=v2.id).exists()


@pytest.mark.django_db
class TestJSONSchemaValidation:
    """Test JSON schema validation for content."""
    
    def test_valid_content_passes_validation(self):
        """Test that valid content passes schema validation."""
        doc = Document.objects.create(slug="valid-schema-test")
        content = {"title": "Valid Title", "body": "Valid body content"}
        
        version = ContentVersion(document=doc, version_number=1, content=content)
        version.clean()  # Should not raise
        version.save()
        
        assert version.pk is not None
    
    def test_invalid_content_fails_validation(self):
        """Test that invalid content fails schema validation."""
        doc = Document.objects.create(slug="invalid-schema-test")
        content = {"body": "Missing title"}  # Missing required 'title' field
        
        version = ContentVersion(document=doc, version_number=1, content=content)
        
        with pytest.raises(ValidationError):
            version.clean()
    
    def test_non_object_content_fails_validation(self):
        """Test that non-object content fails schema validation."""
        doc = Document.objects.create(slug="non-object-test")
        content = "Just a string"  # Should be an object
        
        version = ContentVersion(document=doc, version_number=1, content=content)
        
        with pytest.raises(ValidationError):
            version.clean()


@pytest.mark.django_db
class TestContentHash:
    """Test content hash for integrity verification."""
    
    def test_content_hash_changes_with_content(self):
        """Test that hash changes when content changes."""
        doc = Document.objects.create(slug="hash-test")
        version1 = doc.create_version({"title": "Same", "body": "Content"})
        hash1 = version1.content_hash
        
        version2 = doc.create_version({"title": "Same", "body": "Different"})
        hash2 = version2.content_hash
        
        assert hash1 != hash2
    
    def test_same_content_same_hash(self):
        """Test that identical content produces same hash."""
        doc = Document.objects.create(slug="same-hash-test")
        
        v1 = doc.create_version({"title": "Test", "body": "Content"})
        v2 = doc.create_version({"title": "Test", "body": "Content"})
        
        assert v1.content_hash == v2.content_hash


@pytest.mark.django_db
class TestVersionRelationships:
    """Test version navigation methods."""
    
    def test_get_previous_version(self):
        """Test getting the previous version."""
        doc = Document.objects.create(slug="prev-test")
        v1 = doc.create_version({"title": "V1"})
        v2 = doc.create_version({"title": "V2"})
        v3 = doc.create_version({"title": "V3"})
        
        assert v3.get_previous_version() == v2
        assert v2.get_previous_version() == v1
        assert v1.get_previous_version() is None
    
    def test_get_next_version(self):
        """Test getting the next version."""
        doc = Document.objects.create(slug="next-test")
        v1 = doc.create_version({"title": "V1"})
        v2 = doc.create_version({"title": "V2"})
        v3 = doc.create_version({"title": "V3"})
        
        assert v1.get_next_version() == v2
        assert v2.get_next_version() == v3
        assert v3.get_next_version() is None
    
    def test_is_live_property(self):
        """Test the is_live property."""
        doc = Document.objects.create(slug="live-test")
        v1 = doc.create_version({"title": "V1"})
        v2 = doc.create_version({"title": "V2"})
        
        assert v1.is_live is False
        assert v2.is_live is False
        
        doc.publish_version(v1.id)
        v1.refresh_from_db()
        v2.refresh_from_db()
        
        assert v1.is_live is True
        assert v2.is_live is False
