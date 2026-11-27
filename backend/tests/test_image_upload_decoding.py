"""
Image uploads are decoded only by the formats the app supports (JPEG, PNG, GIF, WebP,
HEIC/HEIF), whatever the file is called, and never above MAX_IMAGE_PIXELS. The last
test pushes a real multipart upload through FastAPI (python-multipart) with the
database and auth dependencies overridden.

    cd backend && .venv/bin/python -m unittest tests.test_image_upload_decoding -v
"""
import asyncio
import importlib.util
import io
import unittest
from unittest import mock

from fastapi import FastAPI, HTTPException, UploadFile
from PIL import Image

from app.api import upload as upload_api
from app.models.user import User


def image_bytes(fmt, size=(64, 48), mode="RGB"):
    buf = io.BytesIO()
    Image.new(mode, size, "white" if mode != "1" else 1).save(buf, fmt)
    return buf.getvalue()


class ImageDecodingTest(unittest.TestCase):
    def setUp(self):
        self.stored = []
        p = mock.patch.object(upload_api, "storage_put",
                              side_effect=lambda path, data, ct, bucket: self.stored.append(path) or f"https://media.example.test/{path}")
        p.start()
        self.addCleanup(p.stop)

    def _upload(self, data, filename):
        return asyncio.run(upload_api.upload_file(UploadFile(file=io.BytesIO(data), filename=filename)))

    def _status(self, data, filename):
        with self.assertRaises(HTTPException) as cm:
            self._upload(data, filename)
        return cm.exception.status_code

    def test_supported_formats_upload(self):
        formats = [("JPEG", "a.jpg"), ("PNG", "a.png"), ("GIF", "a.gif"), ("WEBP", "a.webp")]
        if importlib.util.find_spec("pillow_heif"):
            formats.append(("HEIF", "a.heic"))
        for fmt, name in formats:
            self.stored.clear()
            result = self._upload(image_bytes(fmt), name)
            self.assertEqual(len(self.stored), 3, fmt)
            self.assertEqual(result["metadata"]["dimensions"], {"width": 64, "height": 48})

    def test_other_formats_are_refused_even_when_named_jpg(self):
        for fmt in ("TIFF", "BMP", "ICO", "PPM", "TGA", "PCX"):
            self.assertEqual(self._status(image_bytes(fmt), "photo.jpg"), 400, fmt)
        self.assertEqual(self._status(b"%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 10 10\n", "photo.jpg"), 400)
        self.assertEqual(self._status(b"not an image at all", "photo.png"), 400)
        self.assertEqual(self.stored, [])

    def test_too_many_pixels_is_refused_before_decoding(self):
        # 9000 x 9000 = 81 MP, just over the limit; a 1-bit PNG keeps the test light.
        data = image_bytes("PNG", (9000, 9000), mode="1")
        with mock.patch.object(Image.Image, "load", side_effect=AssertionError("decoded")):
            self.assertEqual(self._status(data, "big.png"), 400)
        self.assertEqual(self.stored, [])

    def test_limit_is_set_on_pillow(self):
        self.assertEqual(Image.MAX_IMAGE_PIXELS, upload_api.MAX_IMAGE_PIXELS)
        self.assertLessEqual(upload_api.MAX_IMAGE_PIXELS, 100_000_000)


class MultipartUploadTest(unittest.TestCase):
    """A real multipart request through FastAPI's form parsing (python-multipart)."""

    def setUp(self):
        from fastapi.testclient import TestClient
        from app.core.deps import require_not_demo

        if importlib.util.find_spec("nh3"):
            from app.main import app  # the whole app, as deployed
        else:  # older venv without the new requirements: just the upload routes
            app = FastAPI()
            app.include_router(upload_api.router, prefix="/api/v1")
        app.dependency_overrides[require_not_demo] = lambda: User(id=1, email="u@example.test", username="u")
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app)
        self.stored = []
        p = mock.patch.object(upload_api, "storage_put",
                              side_effect=lambda path, data, ct, bucket: self.stored.append(path) or f"https://media.example.test/{path}")
        p.start()
        self.addCleanup(p.stop)

    def test_multipart_image_upload(self):
        r = self.client.post("/api/v1/upload", files={"file": ("photo.jpg", image_bytes("JPEG"), "image/jpeg")})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(len(self.stored), 3)
        self.assertTrue(r.json()["urls"]["full"].endswith(".jpg"))

    def test_multipart_refuses_disguised_file(self):
        r = self.client.post("/api/v1/upload", files={"file": ("photo.jpg", image_bytes("TIFF"), "image/jpeg")})
        self.assertEqual(r.status_code, 400, r.text)

    def test_malformed_multipart_is_rejected(self):
        r = self.client.post("/api/v1/upload", content=b"--x\r\nContent-Disposition: form-data\r\n\r\nzzz",
                             headers={"content-type": "multipart/form-data; boundary=x"})
        self.assertIn(r.status_code, (400, 422), r.text)


if __name__ == "__main__":
    unittest.main()
