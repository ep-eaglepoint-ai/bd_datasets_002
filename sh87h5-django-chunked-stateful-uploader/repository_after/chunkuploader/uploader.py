import hashlib
import os
import tempfile
from django.conf import settings

def assemble_file(session, src_dir):
    lock_path = os.path.join(src_dir, ".assemble.lock")
    try:
        lock_fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    try:
        # Ensure all chunks exist
        total_chunks = (session.total_size + session.chunk_size - 1) // session.chunk_size
        chunk_files = [os.path.join(src_dir, f"{i}.part") for i in range(total_chunks)]
        if not all(os.path.exists(f) for f in chunk_files):
            return False

        dest_dir = getattr(settings, "FINAL_UPLOAD_DIR", os.path.join(settings.BASE_DIR, "final"))
        os.makedirs(dest_dir, exist_ok=True)
        final_path = os.path.join(dest_dir, f"{session.file_hash}.bin")
        fd, tmp_path = tempfile.mkstemp(dir=dest_dir, prefix=f"{session.file_hash}.", suffix=".tmp")
        os.close(fd)

        hash_sha256 = hashlib.sha256()
        try:
            with open(tmp_path, "wb") as out:
                for chunk_path in chunk_files:
                    with open(chunk_path, "rb") as part:
                        chunk_bytes = part.read()
                        hash_sha256.update(chunk_bytes)
                        out.write(chunk_bytes)
        except Exception:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            raise

        if hash_sha256.hexdigest() == session.file_hash:
            os.replace(tmp_path, final_path)
            session.is_complete = True
            session.save(update_fields=["is_complete"])
            for f in chunk_files:
                os.remove(f)
            os.rmdir(src_dir)
            return True

        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return False
    finally:
        try:
            os.close(lock_fd)
        except Exception:
            pass
        try:
            if os.path.exists(lock_path):
                os.remove(lock_path)
        except Exception:
            pass