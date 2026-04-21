from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


class LocalFileStorage:
    def __init__(self, upload_dir: str = "uploads") -> None:
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def save_chat_output(self, upload: UploadFile) -> str:
        suffix = Path(upload.filename or "").suffix
        filename = f"{uuid4().hex}{suffix}"
        target = self.upload_dir / filename

        with target.open("wb") as file_obj:
            while True:
                chunk = upload.file.read(1024 * 1024)
                if not chunk:
                    break
                file_obj.write(chunk)

        return f"/uploads/{filename}"
