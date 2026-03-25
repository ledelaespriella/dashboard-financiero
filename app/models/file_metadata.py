from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class FileMetadata(Base):
    __tablename__ = "file_metadata"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    subido_en = Column(DateTime(timezone=True), server_default=func.now())
    total_registros = Column(Integer, default=0)
    
    # Relación bidireccional
    presupuestos = relationship("Presupuesto", back_populates="file", cascade="all, delete-orphan")
