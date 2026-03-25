from pydantic import BaseModel
from typing import List, Optional

class KPISummary(BaseModel):
    total_costo_mes: float
    total_valor: float
    total_registros: int
    rubros: List[str]

class DonutChartData(BaseModel):
    rubro: str
    valor: float

class StackedChartData(BaseModel):
    presupuesto: str
    costo_mes: float
    valor: float

class ProveedorChartData(BaseModel):
    proveedor: str
    valor: float

class DashboardData(BaseModel):
    kpis: KPISummary
    donut: List[DonutChartData]
    stacked: List[StackedChartData]
    proveedores: List[ProveedorChartData]
