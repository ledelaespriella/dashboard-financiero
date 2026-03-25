from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Presupuesto(Base):
    __tablename__ = "presupuestos"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("file_metadata.id", ondelete="CASCADE"), nullable=False)
    
    proveedor = Column(String, index=True, nullable=True)
    rubro = Column(String, index=True, nullable=True)
    tipo = Column(String, nullable=True)
    costo_mes = Column(Float, default=0.0)
    base = Column(Float, default=0.0)
    iva = Column(Float, default=0.0)
    retencion = Column(Float, default=0.0)
    cruce_anticipos = Column(Float, default=0.0)
    valor = Column(Float, default=0.0)
    presupuesto_cat = Column(String, nullable=True)
    observacion = Column(String, nullable=True)
    
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relación bidireccional
    file = relationship("FileMetadata", back_populates="presupuestos")
