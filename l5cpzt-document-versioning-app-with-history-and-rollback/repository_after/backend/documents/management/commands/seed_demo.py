"""Management command to seed demo data."""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from documents.models import Document


class Command(BaseCommand):
    help = 'Seed database with demo user and documents'

    def handle(self, *args, **options):
        # Create demo user
        demo_user, created = User.objects.get_or_create(
            username='demo',
            defaults={
                'email': 'demo@example.com',
                'first_name': 'Demo',
                'last_name': 'User'
            }
        )
        if created:
            demo_user.set_password('demo123')
            demo_user.save()
            self.stdout.write(self.style.SUCCESS('Created demo user (demo / demo123)'))
        else:
            self.stdout.write('Demo user already exists')

        # Create demo documents
        documents_data = [
            {
                'title': 'Welcome Document',
                'versions': [
                    ('Welcome to the Document Versioning App!', 'Initial creation'),
                    ('Welcome to the Document Versioning App!\n\nThis app allows you to track document changes.', 'Added description'),
                    ('Welcome to the Document Versioning App!\n\nThis app allows you to track document changes and rollback to previous versions.', 'Updated features'),
                ]
            },
            {
                'title': 'Project Notes',
                'versions': [
                    ('# Project Notes\n\n- Item 1', 'Started notes'),
                    ('# Project Notes\n\n- Item 1\n- Item 2\n- Item 3', 'Added more items'),
                ]
            },
            {
                'title': 'Meeting Minutes',
                'versions': [
                    ('Meeting on Monday\n\nAttendees: Team A', 'Created meeting notes'),
                ]
            },
        ]

        for doc_data in documents_data:
            # Check if document already exists
            if Document.objects.filter(owner=demo_user, title=doc_data['title']).exists():
                self.stdout.write(f"Document '{doc_data['title']}' already exists, skipping")
                continue

            # Create document with first version content
            first_content = doc_data['versions'][0][0]
            document = Document.objects.create(
                owner=demo_user,
                title=doc_data['title'],
                current_content=first_content
            )
            document.create_version(demo_user, doc_data['versions'][0][1])

            # Create subsequent versions
            for content, note in doc_data['versions'][1:]:
                document.current_content = content
                document.save()
                document.create_version(demo_user, note)

            self.stdout.write(self.style.SUCCESS(
                f"Created '{doc_data['title']}' with {len(doc_data['versions'])} versions"
            ))

        self.stdout.write(self.style.SUCCESS('\nDemo data seeded successfully!'))
        self.stdout.write('Login with: username=demo, password=demo123')
