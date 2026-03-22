from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List

from app.api.dependencies import get_db
from app.services.excel_service import ExcelService
from app.repositories.presupuesto_repo import presupuesto_repo
from app.repositories.file_metadata_repo import file_metadata_repo
from app.schemas.summary import DashboardData, KPISummary, DonutChartData, StackedChartData, ProveedorChartData
from app.schemas.presupuesto import PresupuestoOut
from app.schemas.file_metadata import FileMetadataOut

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel (.xlsx o .xls)")
    
    return ExcelService.process_and_store(file, db)

@router.get("/files", response_model=List[FileMetadataOut])
def get_files(db: Session = Depends(get_db)):
    return file_metadata_repo.get_multi(db, limit=100)

@router.delete("/files/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    file_metadata_repo.remove(db, id=file_id)
    return {"message": f"Archivo {file_id} eliminado exitosamente"}

@router.post("/clear")
def clear_all_data(db: Session = Depends(get_db)):
    presupuesto_repo.clear_all(db)
    file_metadata_repo.clear_all(db)
    return {"message": "Todos los datos eliminados"}

@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_data(file_id: int = Query(...), rubro: Optional[str] = Query(None), db: Session = Depends(get_db)):
    # KPIs
    kpis_raw = presupuesto_repo.get_kpis(db, file_id=file_id, rubro=rubro)
    rubros_list = presupuesto_repo.get_distinct_rubros(db, file_id=file_id)
    kpis = KPISummary(
        total_costo_mes=kpis_raw["total_costo_mes"],
        total_valor=kpis_raw["total_valor"],
        total_registros=kpis_raw["total_registros"],
        rubros=rubros_list
    )
    
    # Donut
    donut_raw = presupuesto_repo.get_donut_data(db, file_id=file_id, rubro=None)
    donut = [DonutChartData(**d) for d in donut_raw]
    
    # Stacked
    stacked_raw = presupuesto_repo.get_stacked_data(db, file_id=file_id, rubro=rubro)
    stacked = [StackedChartData(**d) for d in stacked_raw]
    
    # Proveedores
    prov_raw = presupuesto_repo.get_proveedores_data(db, file_id=file_id, rubro=rubro)
    proveedores = [ProveedorChartData(**d) for d in prov_raw]
    
    return DashboardData(
        kpis=kpis,
        donut=donut,
        stacked=stacked,
        proveedores=proveedores
    )

@router.get("/records", response_model=List[PresupuestoOut])
def get_records(file_id: int = Query(...), rubro: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(presupuesto_repo.model).filter(presupuesto_repo.model.file_id == file_id)
    if rubro:
        query = query.filter(presupuesto_repo.model.rubro == rubro)
    return query.all()
