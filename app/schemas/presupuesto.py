from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PresupuestoBase(BaseModel):
    proveedor: Optional[str] = None
    rubro: Optional[str] = None
    tipo: Optional[str] = None
    costo_mes: float = 0.0
    base: float = 0.0
    iva: float = 0.0
    retencion: float = 0.0
    cruce_anticipos: float = 0.0
    valor: float = 0.0
    presupuesto_cat: Optional[str] = None
    observacion: Optional[str] = None

class PresupuestoCreate(PresupuestoBase):
    pass

class PresupuestoOut(PresupuestoBase):
    id: int
    file_id: int
    creado_en: datetime

    class Config:
        from_attributes = True
