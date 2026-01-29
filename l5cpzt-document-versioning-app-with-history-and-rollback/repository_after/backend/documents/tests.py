"""Unit tests for Document versioning and rollback logic."""
from django.test import TestCase
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Document, DocumentVersion


class DocumentVersionCreationTests(TestCase):
    """Tests for automatic version creation."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_version_created_on_document_create(self):
        """Creating a document should create version 1."""
        document = Document.objects.create(
            owner=self.user,
            title='Test Document',
            current_content='Initial content'
        )
        document.create_version(self.user, 'Initial version')
        
        versions = document.versions.all()
        self.assertEqual(versions.count(), 1)
        self.assertEqual(versions.first().version_number, 1)
        self.assertEqual(versions.first().content_snapshot, 'Initial content')

    def test_version_created_on_document_update(self):
        """Updating a document should create a new version."""
        document = Document.objects.create(
            owner=self.user,
            title='Test Document',
            current_content='Initial content'
        )
        document.create_version(self.user, 'Initial version')
        
        # Update document
        document.current_content = 'Updated content'
        document.save()
        document.create_version(self.user, 'Updated content')
        
        versions = document.versions.all()
        self.assertEqual(versions.count(), 2)
        # Versions are ordered by -version_number, so first is latest
        self.assertEqual(versions.first().version_number, 2)
        self.assertEqual(versions.first().content_snapshot, 'Updated content')

    def test_version_number_auto_increments(self):
        """Version numbers should auto-increment per document."""
        document = Document.objects.create(
            owner=self.user,
            title='Test Document',
            current_content='v1'
        )
        
        for i in range(1, 6):
            document.current_content = f'v{i}'
            document.save()
            version = document.create_version(self.user, f'Version {i}')
            self.assertEqual(version.version_number, i)

    def test_version_numbers_independent_per_document(self):
        """Version numbers should be independent per document."""
        doc1 = Document.objects.create(
            owner=self.user,
            title='Document 1',
            current_content='Doc1 content'
        )
        doc2 = Document.objects.create(
            owner=self.user,
            title='Document 2',
            current_content='Doc2 content'
        )
        
        doc1.create_version(self.user, 'v1')
        doc1.create_version(self.user, 'v2')
        doc2.create_version(self.user, 'v1')
        
        self.assertEqual(doc1.versions.count(), 2)
        self.assertEqual(doc2.versions.count(), 1)
        self.assertEqual(doc1.versions.first().version_number, 2)
        self.assertEqual(doc2.versions.first().version_number, 1)


class DocumentRollbackTests(TestCase):
    """Tests for document rollback functionality."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create document with multiple versions
        self.document = Document.objects.create(
            owner=self.user,
            title='Test Document',
            current_content='Version 1 content'
        )
        self.document.create_version(self.user, 'Initial')
        
        self.document.current_content = 'Version 2 content'
        self.document.save()
        self.document.create_version(self.user, 'Second version')
        
        self.document.current_content = 'Version 3 content'
        self.document.save()
        self.document.create_version(self.user, 'Third version')

    def test_rollback_restores_content(self):
        """Rollback should restore content from target version."""
        # Get version 1
        version1 = self.document.versions.get(version_number=1)
        
        # Rollback to version 1
        self.document.current_content = version1.content_snapshot
        self.document.save()
        
        self.assertEqual(self.document.current_content, 'Version 1 content')

    def test_rollback_creates_new_version(self):
        """Rollback should create a new version entry."""
        initial_version_count = self.document.versions.count()
        
        # Get version 1
        version1 = self.document.versions.get(version_number=1)
        
        # Rollback to version 1
        self.document.current_content = version1.content_snapshot
        self.document.save()
        new_version = self.document.create_version(
            self.user, 
            f'Rolled back to version {version1.version_number}'
        )
        
        self.assertEqual(self.document.versions.count(), initial_version_count + 1)
        self.assertEqual(new_version.version_number, 4)
        self.assertIn('Rolled back', new_version.change_note)

    def test_rollback_atomic_transaction(self):
        """Rollback should be atomic - all or nothing."""
        version1 = self.document.versions.get(version_number=1)
        initial_content = self.document.current_content
        initial_version_count = self.document.versions.count()
        
        try:
            with transaction.atomic():
                self.document.current_content = version1.content_snapshot
                self.document.save()
                self.document.create_version(self.user, 'Rollback')
                # Simulate an error
                raise Exception("Simulated error")
        except Exception:
            pass
        
        # Refresh from database
        self.document.refresh_from_db()
        
        # Content and version count should be unchanged due to rollback
        self.assertEqual(self.document.current_content, initial_content)
        self.assertEqual(self.document.versions.count(), initial_version_count)


class DocumentAPITests(APITestCase):
    """API tests for document endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_document_creates_version(self):
        """Creating document via API should create version 1."""
        response = self.client.post('/api/documents/', {
            'title': 'New Document',
            'current_content': 'Content here',
            'change_note': 'Initial'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        document = Document.objects.get(title='New Document')
        self.assertEqual(document.versions.count(), 1)
        self.assertEqual(document.versions.first().version_number, 1)

    def test_update_document_creates_version(self):
        """Updating document via API should create new version."""
        document = Document.objects.create(
            owner=self.user,
            title='Test Doc',
            current_content='Original'
        )
        document.create_version(self.user, 'Initial')
        
        response = self.client.patch(f'/api/documents/{document.id}/', {
            'current_content': 'Updated',
            'change_note': 'Made changes'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        document.refresh_from_db()
        self.assertEqual(document.versions.count(), 2)

    def test_user_cannot_access_other_users_documents(self):
        """Users should not see other users' documents."""
        # Create document for other user
        other_doc = Document.objects.create(
            owner=self.other_user,
            title='Other Doc',
            current_content='Content'
        )
        
        # Try to access it
        response = self.client.get(f'/api/documents/{other_doc.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_rollback_via_api(self):
        """Test rollback endpoint."""
        document = Document.objects.create(
            owner=self.user,
            title='Test Doc',
            current_content='Version 1'
        )
        v1 = document.create_version(self.user, 'v1')
        
        document.current_content = 'Version 2'
        document.save()
        document.create_version(self.user, 'v2')
        
        # Rollback to v1
        response = self.client.post(
            f'/api/documents/{document.id}/versions/{v1.id}/rollback/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        document.refresh_from_db()
        self.assertEqual(document.current_content, 'Version 1')
        self.assertEqual(document.versions.count(), 3)
