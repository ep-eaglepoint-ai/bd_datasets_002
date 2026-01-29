import hashlib
import magic
from celery import shared_task
from django.conf import settings
from .models import FileAsset
from django.core.files.storage import default_storage
import os

def scan_for_viruses(file_obj):
    # Hook for virus scanning

    if os.environ.get('SIMULATE_VIRUS_SCAN_FAILURE') == 'true':
        return False
    return True

@shared_task
def process_file_upload(file_id):
    try:
        # Retrieve the file asset
        asset = FileAsset.objects.get(id=file_id)

        asset.processing_status = FileAsset.ProcessingStatus.RUNNING
        asset.save()

        sha256 = hashlib.sha256()
        
        # Using mime=True content detection
        detected_mime = None
        
        # Calculate checksum and clean up file stream
        file_obj = asset.file
        try:
            file_obj.open('rb')
        except Exception as e:
             # Handle storage errors
             asset.error_message = f"Storage error: {str(e)}"
             asset.processing_status = FileAsset.ProcessingStatus.FAILED
             asset.save()
             return

        chunk_size = 4096
        
        # Read first chunk for magic detection
        first_chunk = file_obj.read(chunk_size)
        if first_chunk:
            detected_mime = magic.from_buffer(first_chunk, mime=True)
            sha256.update(first_chunk)
        
        while True:
            chunk = file_obj.read(chunk_size)
            if not chunk:
                break
            sha256.update(chunk)
        
        
        asset.sha256_checksum = sha256.hexdigest()
        asset.mime_type = detected_mime
        
        # Extract file extension from original filename
        if asset.original_filename and '.' in asset.original_filename:
            asset.file_extension = asset.original_filename.rsplit('.', 1)[1].lower()
        
        # Detect encoding for text files
        if detected_mime and detected_mime.startswith('text/'):
            try:
                # Try to detect encoding
                file_obj.seek(0)
                sample = file_obj.read(8192)  # Read first 8KB for encoding detection
                
                # Try common encodings
                for encoding in ['utf-8', 'ascii', 'latin-1', 'cp1252']:
                    try:
                        sample.decode(encoding)
                        asset.encoding = encoding
                        break
                    except (UnicodeDecodeError, AttributeError):
                        continue
            except Exception:
                pass
        
        # Validate MIME

        allowed = settings.ALLOWED_MIME_TYPES
        blocked = settings.BLOCKED_MIME_TYPES
        
        if allowed and '*' not in allowed:
            if detected_mime not in allowed:
                asset.processing_status = FileAsset.ProcessingStatus.FAILED
                asset.error_message = f"MIME type {detected_mime} is not allowed."
                asset.save()
                return

        if blocked and detected_mime in blocked:
            asset.processing_status = FileAsset.ProcessingStatus.FAILED
            asset.error_message = f"MIME type {detected_mime} is blocked."
            asset.save()
            return

        # Virus Scan
        if not scan_for_viruses(file_obj):
            asset.processing_status = FileAsset.ProcessingStatus.FAILED
            asset.error_message = "File failed virus scan."
            asset.save()
            return
            
        # Metadata extraction
        # Reset pointer
        try:
            file_obj.seek(0)
        except:
             # If seek fails (some streams), we might need to reopen
             file_obj.close()
             file_obj.open('rb')

        if detected_mime and detected_mime.startswith('image/'):
            try:
                from PIL import Image
                # Pillow might need explicit seekable stream
                # If remote storage, might be slow.
                with Image.open(file_obj) as img:
                    asset.image_width = img.width
                    asset.image_height = img.height
            except Exception:
                pass 
                
        elif detected_mime == 'application/pdf':
            try:
                import PyPDF2
                # Ensure at start
                file_obj.seek(0)
                reader = PyPDF2.PdfReader(file_obj)
                asset.page_count = len(reader.pages)
            except Exception:
                pass
        
        # Extract duration for audio/video files
        elif detected_mime and (detected_mime.startswith('audio/') or detected_mime.startswith('video/')):
            try:
                from mutagen import File as MutagenFile
                # Mutagen works with file paths, so we need to use the actual file path
                # For local storage, we can get the path; for S3, this might not work
                if hasattr(asset.file, 'path'):
                    audio = MutagenFile(asset.file.path)
                    if audio and hasattr(audio.info, 'length'):
                        asset.duration = audio.info.length
            except Exception:
                pass
        
        # Extract file timestamps if available (for local storage)
        try:
            if hasattr(asset.file, 'path'):
                import os
                from datetime import datetime
                stat_info = os.stat(asset.file.path)
                
                # Store in extra_attributes since we already have created_at/modified_at for the model
                asset.extra_attributes['file_created_timestamp'] = datetime.fromtimestamp(stat_info.st_ctime).isoformat()
                asset.extra_attributes['file_modified_timestamp'] = datetime.fromtimestamp(stat_info.st_mtime).isoformat()
        except Exception:
            pass

        asset.processing_status = FileAsset.ProcessingStatus.SUCCEEDED

        asset.save()
        file_obj.close()

    except FileAsset.DoesNotExist:
        pass
    except Exception as e:
        if 'asset' in locals():
            asset.processing_status = FileAsset.ProcessingStatus.FAILED
            asset.error_message = str(e)
            asset.save()
