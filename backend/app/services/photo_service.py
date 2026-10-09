from __future__ import annotations

import hashlib
import hmac
import mimetypes
from pathlib import Path, PurePosixPath
from time import time
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from ..core.config import PUBLIC_API_BASE_URL, UPLOADS_DIR
from ..db.database import insert_row
from ..auth.local_auth import _signing_key

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PHOTO_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}
MAX_PHOTO_BYTES = 10 * 1024 * 1024


def _signature(path: str, expires: int) -> str:
    message = f"{path}:{expires}".encode("utf-8")
    return hmac.new(_signing_key().encode("utf-8"), message, hashlib.sha256).hexdigest()


async def upload_photo(file: UploadFile, owner_id: str) -> dict[str, str]:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    file_bytes = await file.read(MAX_PHOTO_BYTES + 1)
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")
    if len(file_bytes) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="Image file is too large (maximum 10 MB)")
    expected_type = PHOTO_CONTENT_TYPES[ext]
    if file.content_type not in {None, expected_type, "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Image content type does not match its file extension")
    valid_signature = (
        (ext in {".jpg", ".jpeg"} and file_bytes.startswith(b"\xff\xd8\xff"))
        or (ext == ".png" and file_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
        or (ext == ".webp" and file_bytes.startswith(b"RIFF") and file_bytes[8:12] == b"WEBP")
    )
    if not valid_signature:
        raise HTTPException(status_code=400, detail="The uploaded file is not a supported image")

    relative_path = PurePosixPath("persons") / owner_id / f"{uuid4().hex}{ext}"
    target = (Path(UPLOADS_DIR) / Path(*relative_path.parts)).resolve()
    uploads_root = Path(UPLOADS_DIR).resolve()
    if not target.is_relative_to(uploads_root):
        raise HTTPException(status_code=400, detail="Invalid photo path")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(file_bytes)
    photo_path = relative_path.as_posix()
    try:
        insert_row(
            "photo_uploads",
            {
                "path": photo_path,
                "owner_user_id": owner_id,
                "content_type": expected_type,
                "size_bytes": len(file_bytes),
            },
        )
    except Exception:
        target.unlink(missing_ok=True)
        raise
    return {"photoPath": photo_path}


def create_signed_url(path: str, expires_in: int = 3600) -> dict[str, object]:
    relative = PurePosixPath(path)
    if relative.is_absolute() or ".." in relative.parts or "\\" in path:
        raise HTTPException(status_code=400, detail="Invalid photo path")
    expires = int(time()) + expires_in
    signature = _signature(path, expires)
    return {
        "url": f"{PUBLIC_API_BASE_URL}/photos/local?path={path}&expires={expires}&signature={signature}",
        "expiresIn": expires_in,
    }


def verify_local_photo_signature(path: str, expires: int, signature: str) -> Path:
    if expires < int(time()):
        raise HTTPException(status_code=403, detail="Photo link has expired")
    if not hmac.compare_digest(_signature(path, expires), signature):
        raise HTTPException(status_code=403, detail="Invalid photo link")
    relative = PurePosixPath(path)
    if relative.is_absolute() or ".." in relative.parts or "\\" in path:
        raise HTTPException(status_code=400, detail="Invalid photo path")
    target = (Path(UPLOADS_DIR) / Path(*relative.parts)).resolve()
    if not target.is_relative_to(Path(UPLOADS_DIR).resolve()) or not target.is_file():
        raise HTTPException(status_code=404, detail="Photo not found")
    return target


def content_type_for_photo(path: Path) -> str:
    return mimetypes.guess_type(path.name)[0] or "application/octet-stream"
