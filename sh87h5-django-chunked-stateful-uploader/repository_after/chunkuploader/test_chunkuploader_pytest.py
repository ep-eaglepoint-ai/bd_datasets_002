import hashlib
import os

import pytest
from django.apps import apps
from django.core.files.uploadedfile import SimpleUploadedFile

DEFAULT_CHUNK_SIZE = 512 * 1024


def _make_payload(size: int) -> bytes:
    return (b"abcd" * (size // 4)) + b"x" * (size % 4)


def _hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _post_chunk(client, file_hash, index, total_size, chunk_size, data, final=False):
    file_obj = SimpleUploadedFile(
        f"{index}.part",
        data,
        content_type="application/octet-stream",
    )
    return client.post(
        "/upload/ingest/",
        {
            "hash": file_hash,
            "index": str(index),
            "total_size": str(total_size),
            "chunk_size": str(chunk_size),
            "final": "1" if final else "0",
            "chunk": file_obj,
        },
    )


def _get_filesession_model():
    return apps.get_model("chunkuploader", "FileSession")


@pytest.fixture(autouse=True)
def _override_chunk_dirs(settings, tmp_path):
    settings.CHUNK_UPLOAD_DIR = str(tmp_path / "chunks")
    settings.FINAL_UPLOAD_DIR = str(tmp_path / "final")
    os.makedirs(settings.CHUNK_UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.FINAL_UPLOAD_DIR, exist_ok=True)


@pytest.mark.django_db
def test_handshake_new_incomplete_and_exists(client):
    chunk_size = DEFAULT_CHUNK_SIZE
    total_size = chunk_size * 3
    data = _make_payload(total_size)
    file_hash = _hash_bytes(data)

    response = client.get(f"/upload/handshake/?hash={file_hash}")
    assert response.status_code == 200
    assert response.json()["status"] == "new"

    first_chunk = data[:chunk_size]
    response = _post_chunk(client, file_hash, 0, total_size, chunk_size, first_chunk, final=False)
    assert response.status_code == 200

    response = client.get(f"/upload/handshake/?hash={file_hash}")
    payload = response.json()
    assert payload["status"] == "incomplete"
    assert payload["missing"] == [1, 2]

    _post_chunk(client, file_hash, 1, total_size, chunk_size, data[chunk_size:chunk_size * 2])
    _post_chunk(client, file_hash, 2, total_size, chunk_size, data[chunk_size * 2:], final=True)

    response = client.get(f"/upload/handshake/?hash={file_hash}")
    assert response.json()["status"] == "file_exists"


@pytest.mark.django_db
def test_reassembly_integrity_and_final_file(client, settings):
    chunk_size = DEFAULT_CHUNK_SIZE
    total_size = chunk_size * 3
    data = _make_payload(total_size)
    file_hash = _hash_bytes(data)

    for index in range(3):
        start = index * chunk_size
        end = start + chunk_size
        _post_chunk(
            client,
            file_hash,
            index,
            total_size,
            chunk_size,
            data[start:end],
            final=(index == 2),
        )

    FileSession = _get_filesession_model()
    session = FileSession.objects.get(file_hash=file_hash)
    assert session.is_complete is True

    final_path = os.path.join(settings.FINAL_UPLOAD_DIR, f"{file_hash}.bin")
    assert os.path.exists(final_path)
    with open(final_path, "rb") as handle:
        assert handle.read() == data


@pytest.mark.django_db
def test_invalid_chunk_size_does_not_mutate_state(client):
    chunk_size = DEFAULT_CHUNK_SIZE
    total_size = chunk_size * 3
    data = _make_payload(total_size)
    file_hash = _hash_bytes(data)

    bad_chunk = data[:1024]
    response = _post_chunk(client, file_hash, 0, total_size, chunk_size, bad_chunk, final=False)
    assert response.status_code == 400

    FileSession = _get_filesession_model()
    session = FileSession.objects.get(file_hash=file_hash)
    session.ensure_chunk_map()
    assert session.chunks_uploaded_map == "000"


@pytest.mark.django_db
def test_out_of_range_chunk_is_rejected(client):
    chunk_size = DEFAULT_CHUNK_SIZE
    total_size = chunk_size * 3
    data = _make_payload(total_size)
    file_hash = _hash_bytes(data)

    response = _post_chunk(client, file_hash, 3, total_size, chunk_size, data[:chunk_size])
    assert response.status_code == 400

    FileSession = _get_filesession_model()
    session = FileSession.objects.get(file_hash=file_hash)
    session.ensure_chunk_map()
    assert session.chunks_uploaded_map == "000"


@pytest.mark.django_db
def test_out_of_order_upload_does_not_corrupt_map(client):
    chunk_size = DEFAULT_CHUNK_SIZE
    total_size = chunk_size * 3
    data = _make_payload(total_size)
    file_hash = _hash_bytes(data)

    _post_chunk(client, file_hash, 2, total_size, chunk_size, data[chunk_size * 2:], final=False)

    FileSession = _get_filesession_model()
    session = FileSession.objects.get(file_hash=file_hash)
    session.ensure_chunk_map()
    assert session.chunks_uploaded_map == "001"

    _post_chunk(client, file_hash, 0, total_size, chunk_size, data[:chunk_size], final=False)
    _post_chunk(client, file_hash, 1, total_size, chunk_size, data[chunk_size:chunk_size * 2], final=True)

    session.refresh_from_db()
    assert session.is_complete is True


@pytest.mark.django_db
def test_duplicate_chunk_upload_is_idempotent(client):
    chunk_size = DEFAULT_CHUNK_SIZE
    total_size = chunk_size * 2
    data = _make_payload(total_size)
    file_hash = _hash_bytes(data)

    _post_chunk(client, file_hash, 0, total_size, chunk_size, data[:chunk_size])
    _post_chunk(client, file_hash, 0, total_size, chunk_size, data[:chunk_size])

    FileSession = _get_filesession_model()
    session = FileSession.objects.get(file_hash=file_hash)
    session.ensure_chunk_map()
    assert session.chunks_uploaded_map == "10"


@pytest.mark.django_db
def test_mismatched_session_parameters_are_rejected(client):
    chunk_size = DEFAULT_CHUNK_SIZE
    total_size = chunk_size * 2
    data = _make_payload(total_size)
    file_hash = _hash_bytes(data)

    _post_chunk(client, file_hash, 0, total_size, chunk_size, data[:chunk_size])

    response = _post_chunk(
        client,
        file_hash,
        1,
        total_size + 1,
        chunk_size,
        data[chunk_size:],
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_last_chunk_size_validation(client):
    chunk_size = DEFAULT_CHUNK_SIZE
    total_size = (chunk_size * 2) + 123
    data = _make_payload(total_size)
    file_hash = _hash_bytes(data)

    _post_chunk(client, file_hash, 0, total_size, chunk_size, data[:chunk_size])
    _post_chunk(client, file_hash, 1, total_size, chunk_size, data[chunk_size:chunk_size * 2])

    bad_last = data[chunk_size * 2:chunk_size * 2 + 50]
    response = _post_chunk(client, file_hash, 2, total_size, chunk_size, bad_last, final=True)
    assert response.status_code == 400

    good_last = data[chunk_size * 2:]
    response = _post_chunk(client, file_hash, 2, total_size, chunk_size, good_last, final=True)
    assert response.status_code == 200
