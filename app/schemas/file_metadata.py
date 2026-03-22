from pydantic import BaseModel
from datetime import datetime
from typing import List

class FileMetadataBase(BaseModel):
    filename: str
    total_registros: int

class FileMetadataCreate(FileMetadataBase):
    pass

class FileMetadataOut(FileMetadataBase):
    id: int
    subido_en: datetime

    class Config:
        from_attributes = True
