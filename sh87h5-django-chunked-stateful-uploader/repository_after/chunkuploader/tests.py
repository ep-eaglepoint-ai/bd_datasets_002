import hashlib
import io
import os
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings

from .models import FileSession


class FileSessionUnitTests(TestCase):
	def test_chunk_map_tracking(self):
		session = FileSession.objects.create(
			file_hash="a" * 64,
			total_size=15,
			chunk_size=5,
		)
		session.ensure_chunk_map()
		self.assertEqual(session.chunks_uploaded_map, "000")

		session.mark_chunk_uploaded(0)
		session.save()
		self.assertEqual(session.chunks_uploaded_map, "100")
		self.assertEqual(session.chunks_uploaded, [0])

		session.mark_chunk_uploaded(2)
		session.save()
		self.assertEqual(session.chunks_uploaded_map, "101")
		self.assertEqual(sorted(session.chunks_uploaded), [0, 2])


@override_settings(
	CHUNK_UPLOAD_DIR=None,
	FINAL_UPLOAD_DIR=None,
)
class ChunkUploadIntegrationTests(TestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls._chunk_dir_ctx = tempfile.TemporaryDirectory()
		cls._final_dir_ctx = tempfile.TemporaryDirectory()

	@classmethod
	def tearDownClass(cls):
		cls._chunk_dir_ctx.cleanup()
		cls._final_dir_ctx.cleanup()
		super().tearDownClass()

	def setUp(self):
		self.client = Client()
		self.chunk_root = self._chunk_dir_ctx.name
		self.final_root = self._final_dir_ctx.name
		self.override = override_settings(
			CHUNK_UPLOAD_DIR=self.chunk_root,
			FINAL_UPLOAD_DIR=self.final_root,
		)
		self.override.enable()

	def tearDown(self):
		self.override.disable()

	def _make_payload(self, size):
		return (b"abcd" * (size // 4)) + b"x" * (size % 4)

	def _file_hash(self, data: bytes) -> str:
		return hashlib.sha256(data).hexdigest()

	def _post_chunk(self, file_hash, index, total_size, chunk_size, data, final=False):
		file_obj = SimpleUploadedFile(
			f"{index}.part",
			data,
			content_type="application/octet-stream",
		)
		return self.client.post(
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

	def test_handshake_and_resume_flow(self):
		chunk_size = 5 * 1024 * 1024
		total_size = chunk_size * 3
		data = self._make_payload(total_size)
		file_hash = self._file_hash(data)

		response = self.client.get(f"/upload/handshake/?hash={file_hash}")
		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json()["status"], "new")

		first_chunk = data[:chunk_size]
		response = self._post_chunk(
			file_hash=file_hash,
			index=0,
			total_size=total_size,
			chunk_size=chunk_size,
			data=first_chunk,
			final=False,
		)
		self.assertEqual(response.status_code, 200)

		response = self.client.get(f"/upload/handshake/?hash={file_hash}")
		payload = response.json()
		self.assertEqual(payload["status"], "incomplete")
		self.assertEqual(payload["missing"], [1, 2])

		second_chunk = data[chunk_size:chunk_size * 2]
		third_chunk = data[chunk_size * 2:]

		response = self._post_chunk(
			file_hash=file_hash,
			index=1,
			total_size=total_size,
			chunk_size=chunk_size,
			data=second_chunk,
			final=False,
		)
		self.assertEqual(response.status_code, 200)

		response = self._post_chunk(
			file_hash=file_hash,
			index=2,
			total_size=total_size,
			chunk_size=chunk_size,
			data=third_chunk,
			final=True,
		)
		self.assertEqual(response.status_code, 200)

		session = FileSession.objects.get(file_hash=file_hash)
		self.assertTrue(session.is_complete)

		final_path = os.path.join(self.final_root, f"{file_hash}.bin")
		self.assertTrue(os.path.exists(final_path))
		with open(final_path, "rb") as handle:
			assembled = handle.read()
		self.assertEqual(assembled, data)

	def test_invalid_chunk_size_does_not_corrupt_state(self):
		chunk_size = 5 * 1024 * 1024
		total_size = chunk_size * 3
		data = self._make_payload(total_size)
		file_hash = self._file_hash(data)

		bad_chunk = data[:1024]
		response = self._post_chunk(
			file_hash=file_hash,
			index=0,
			total_size=total_size,
			chunk_size=chunk_size,
			data=bad_chunk,
			final=False,
		)
		self.assertEqual(response.status_code, 400)

		session = FileSession.objects.get(file_hash=file_hash)
		session.ensure_chunk_map()
		self.assertEqual(session.chunks_uploaded_map, "000")

	def test_out_of_range_chunk_is_rejected(self):
		chunk_size = 5 * 1024 * 1024
		total_size = chunk_size * 3
		data = self._make_payload(total_size)
		file_hash = self._file_hash(data)

		response = self._post_chunk(
			file_hash=file_hash,
			index=3,
			total_size=total_size,
			chunk_size=chunk_size,
			data=data[:chunk_size],
			final=False,
		)
		self.assertEqual(response.status_code, 400)

		session = FileSession.objects.get(file_hash=file_hash)
		session.ensure_chunk_map()
		self.assertEqual(session.chunks_uploaded_map, "000")
