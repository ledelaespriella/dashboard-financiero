from typing import Optional
from sqlalchemy.orm import Session
from app.models.file_metadata import FileMetadata
from app.schemas.file_metadata import FileMetadataCreate
from app.repositories.base import CRUDBase

class CRUDFileMetadata(CRUDBase[FileMetadata, FileMetadataCreate, FileMetadataCreate]):
    def clear_all(self, db: Session) -> None:
        db.query(FileMetadata).delete()
        db.commit()

    def get_latest(self, db: Session) -> Optional[FileMetadata]:
        return db.query(FileMetadata).order_by(FileMetadata.subido_en.desc()).first()

file_metadata_repo = CRUDFileMetadata(FileMetadata)
