import os
from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse
from .models import FileSession
from django.views.decorators.csrf import csrf_exempt

def handshake(request):
    file_hash = request.GET.get("hash", "").strip()
    if not file_hash:
        return JsonResponse({"error": "hash required"}, status=400)
    try:
        session = FileSession.objects.get(file_hash=file_hash)
        if session.is_complete:
            return JsonResponse({"status": "file_exists"})
        else:
            session.ensure_chunk_map()
            total = session.total_chunks()
            if not session.chunks_uploaded_map:
                missing = list(range(total))
            else:
                missing = [
                    idx for idx, flag in enumerate(session.chunks_uploaded_map)
                    if flag == "0"
                ]
            return JsonResponse({"status": "incomplete", "missing": missing})
    except FileSession.DoesNotExist:
        return JsonResponse({"status": "new"})


def upload_page(request):
    return render(request, "chunkuploader/upload.html")

@csrf_exempt
def ingest_chunk(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    # File params: hash, index, total_size, chunk file
    file_hash = request.POST.get("hash", "").strip()
    if not file_hash:
        return JsonResponse({"error": "hash required"}, status=400)
    try:
        index = int(request.POST.get("index", ""))
        total_size = int(request.POST.get("total_size", ""))
        client_chunk_size = int(request.POST.get("chunk_size", ""))
    except (TypeError, ValueError):
        return JsonResponse({"error": "index, total_size, chunk_size required"}, status=400)
    if "chunk" not in request.FILES:
        return JsonResponse({"error": "chunk file required"}, status=400)
    chunk = request.FILES["chunk"]
    if index < 0:
        return JsonResponse({"error": "invalid chunk index"}, status=400)

    session, created = FileSession.objects.get_or_create(file_hash=file_hash, defaults={
        "total_size": total_size,
        "chunk_size": client_chunk_size,
    })
    if not created:
        if session.total_size != total_size or session.chunk_size != client_chunk_size:
            return JsonResponse({"error": "session parameters mismatch"}, status=400)

    total_chunks = session.total_chunks()
    if total_chunks <= 0 or index >= total_chunks:
        return JsonResponse({"error": "chunk index out of range"}, status=400)

    expected_size = session.chunk_size
    if index == total_chunks - 1:
        expected_size = session.total_size - (session.chunk_size * (total_chunks - 1))
    if chunk.size != expected_size:
        return JsonResponse({"error": "invalid chunk size"}, status=400)

    # Directory for this upload
    chunk_root = getattr(settings, "CHUNK_UPLOAD_DIR", os.path.join(settings.BASE_DIR, "chunks"))
    tmp_dir = os.path.join(chunk_root, str(session.id))
    os.makedirs(tmp_dir, exist_ok=True)
    chunk_path = os.path.join(tmp_dir, f"{index}.part")
    if not os.path.exists(chunk_path):
        with open(chunk_path, "wb") as f:
            for chunk_piece in chunk.chunks():
                f.write(chunk_piece)

    # Update DB state (atomic update preferred in real use)
    session.mark_chunk_uploaded(index)
    session.save(update_fields=["chunks_uploaded", "chunks_uploaded_map", "updated_at"])

    # If it's the last chunk, trigger assembly (could be async)
    is_final_chunk = int(request.POST.get("final", 0))
    if is_final_chunk:
        from .uploader import assemble_file
        assemble_file(session, tmp_dir)
    return JsonResponse({"ok": True})