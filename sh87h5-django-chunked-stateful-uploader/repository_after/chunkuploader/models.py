from django.db import models
from django.utils import timezone

class FileSession(models.Model):
    file_hash = models.CharField(max_length=64, unique=True)    # SHA256
    total_size = models.BigIntegerField()
    chunk_size = models.IntegerField()
    chunks_uploaded = models.JSONField(default=list)            # List of ints
    chunks_uploaded_map = models.TextField(default="")          # Bitmap string (e.g., 101001)
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def total_chunks(self) -> int:
        if not self.chunk_size:
            return 0
        return (self.total_size + self.chunk_size - 1) // self.chunk_size

    def ensure_chunk_map(self) -> None:
        total = self.total_chunks()
        if total <= 0:
            return
        if len(self.chunks_uploaded_map) != total:
            existing = set(self.chunks_uploaded or [])
            self.chunks_uploaded_map = "".join(
                "1" if idx in existing else "0" for idx in range(total)
            )

    def mark_chunk_uploaded(self, index: int) -> None:
        if index < 0:
            return
        self.ensure_chunk_map()
        if not self.chunks_uploaded_map:
            return
        map_list = list(self.chunks_uploaded_map)
        if index < len(map_list):
            map_list[index] = "1"
            self.chunks_uploaded_map = "".join(map_list)
        if index not in (self.chunks_uploaded or []):
            self.chunks_uploaded.append(index)