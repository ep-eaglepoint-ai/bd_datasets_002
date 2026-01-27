import os
import shutil
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from chunkuploader.models import FileSession


class Command(BaseCommand):
    help = "Purge incomplete FileSession records and orphaned chunk directories."

    def add_arguments(self, parser):
        parser.add_argument(
            "--hours",
            type=int,
            default=48,
            help="Purge sessions not updated in the last N hours (default: 48).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without removing anything.",
        )

    def handle(self, *args, **options):
        hours = options["hours"]
        dry_run = options["dry_run"]
        cutoff = timezone.now() - timedelta(hours=hours)

        chunk_root = getattr(settings, "CHUNK_UPLOAD_DIR", os.path.join(settings.BASE_DIR, "chunks"))
        os.makedirs(chunk_root, exist_ok=True)

        stale_sessions = FileSession.objects.filter(is_complete=False, updated_at__lt=cutoff)
        session_ids = set(stale_sessions.values_list("id", flat=True))
        removed_sessions = 0
        removed_dirs = 0

        for session in stale_sessions:
            session_dir = os.path.join(chunk_root, str(session.id))
            legacy_dir = os.path.join(chunk_root, session.file_hash)
            if dry_run:
                self.stdout.write(f"Would delete session {session.id} and directory {session_dir}")
            else:
                session.delete()
                removed_sessions += 1
                self._safe_rmtree(session_dir)
                self._safe_rmtree(legacy_dir)

        # Remove orphaned directories not tied to any active session
        active_ids = set(FileSession.objects.values_list("id", flat=True))
        for name in os.listdir(chunk_root):
            dir_path = os.path.join(chunk_root, name)
            if not os.path.isdir(dir_path):
                continue
            if name.isdigit() and int(name) in active_ids:
                continue
            if name in {s.file_hash for s in FileSession.objects.all()}:
                continue
            if self._is_older_than(dir_path, cutoff):
                if dry_run:
                    self.stdout.write(f"Would delete orphaned directory {dir_path}")
                else:
                    self._safe_rmtree(dir_path)
                    removed_dirs += 1

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(
                f"Purged {removed_sessions} sessions and {removed_dirs} directories."))

    def _safe_rmtree(self, path):
        try:
            if os.path.exists(path):
                shutil.rmtree(path, ignore_errors=True)
        except Exception:
            pass

    def _is_older_than(self, path, cutoff):
        try:
            mtime = timezone.datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.get_current_timezone())
            return mtime < cutoff
        except Exception:
            return False
