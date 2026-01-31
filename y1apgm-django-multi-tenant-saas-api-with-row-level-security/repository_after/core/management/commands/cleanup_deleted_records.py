"""
Management command to clean up soft-deleted records older than 30 days.

This enforces the 30-day recovery period policy by permanently deleting
records that have been soft-deleted for more than 30 days.

Usage:
    python manage.py cleanup_deleted_records
    python manage.py cleanup_deleted_records --days=60  # Custom retention period
    python manage.py cleanup_deleted_records --dry-run  # Preview without deleting
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from core.models import Project, Task, Organization


class Command(BaseCommand):
    help = 'Permanently delete soft-deleted records older than the retention period (default: 30 days)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days after which soft-deleted records are permanently deleted (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        cutoff_date = timezone.now() - timedelta(days=days)
        
        self.stdout.write(
            f"{'[DRY RUN] ' if dry_run else ''}Cleaning up records soft-deleted before {cutoff_date.isoformat()}"
        )
        
        models_to_clean = [
            ('Project', Project),
            ('Task', Task),
            ('Organization', Organization),
        ]
        
        total_deleted = 0
        
        for model_name, model_class in models_to_clean:
            # Get soft-deleted records older than cutoff
            old_deleted = model_class.all_objects.filter(
                is_deleted=True,
                deleted_at__lt=cutoff_date
            )
            
            count = old_deleted.count()
            
            if count > 0:
                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  Would delete {count} {model_name}(s)"
                        )
                    )
                    # List the records that would be deleted
                    for obj in old_deleted[:10]:  # Show first 10
                        self.stdout.write(f"    - {obj}")
                    if count > 10:
                        self.stdout.write(f"    ... and {count - 10} more")
                else:
                    # Actually delete the records
                    deleted_count, _ = old_deleted.delete()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  Deleted {deleted_count} {model_name}(s)"
                        )
                    )
                    total_deleted += deleted_count
            else:
                self.stdout.write(f"  No expired {model_name}s to clean up")
        
        if dry_run:
            self.stdout.write(
                self.style.NOTICE(
                    f"\n[DRY RUN] Total records that would be deleted: {sum(m.all_objects.filter(is_deleted=True, deleted_at__lt=cutoff_date).count() for _, m in models_to_clean)}"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nTotal records permanently deleted: {total_deleted}"
                )
            )
