from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.presupuesto import Presupuesto
from app.schemas.presupuesto import PresupuestoCreate
from app.repositories.base import CRUDBase

class CRUDPresupuesto(CRUDBase[Presupuesto, PresupuestoCreate, PresupuestoCreate]):
    
    def clear_all(self, db: Session) -> None:
        """Elimina todos los registros de presupuestos (y por cascada file metadata si se maneja desde allí, o al revés)."""
        db.query(Presupuesto).delete()
        db.commit()

    def bulk_create(self, db: Session, records: List[dict], file_id: int):
        objects = [Presupuesto(file_id=file_id, **r) for r in records]
        db.bulk_save_objects(objects)
        db.commit()

    def get_distinct_rubros(self, db: Session, file_id: int) -> List[str]:
        result = db.query(Presupuesto.rubro).distinct().filter(
            Presupuesto.file_id == file_id,
            Presupuesto.rubro != None
        ).all()
        return [r[0] for r in result]

    def get_kpis(self, db: Session, file_id: int, rubro: Optional[str] = None) -> Dict[str, Any]:
        query = db.query(
            func.sum(Presupuesto.costo_mes).label('total_costo_mes'),
            func.sum(Presupuesto.valor).label('total_valor'),
            func.count(Presupuesto.id).label('total_registros')
        ).filter(Presupuesto.file_id == file_id)
        
        if rubro:
            query = query.filter(Presupuesto.rubro == rubro)
        
        result = query.first()
        return {
            "total_costo_mes": result.total_costo_mes or 0.0,
            "total_valor": result.total_valor or 0.0,
            "total_registros": result.total_registros or 0
        }

    def get_donut_data(self, db: Session, file_id: int, rubro: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(
            Presupuesto.rubro,
            func.sum(Presupuesto.valor).label('valor')
        ).filter(Presupuesto.file_id == file_id).group_by(Presupuesto.rubro).order_by(desc('valor'))
        
        results = query.all()
        return [{"rubro": r.rubro or "(Vacío)", "valor": r.valor} for r in results]

    def get_stacked_data(self, db: Session, file_id: int, rubro: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        query = db.query(
            Presupuesto.presupuesto_cat,
            func.sum(Presupuesto.costo_mes).label('costo_mes'),
            func.sum(Presupuesto.valor).label('valor')
        ).filter(Presupuesto.file_id == file_id)
        
        if rubro:
            query = query.filter(Presupuesto.rubro == rubro)
            
        query = query.group_by(Presupuesto.presupuesto_cat).order_by(desc('valor')).limit(limit)
        results = query.all()
        return [{"presupuesto": r.presupuesto_cat or "(Vacío)", "costo_mes": r.costo_mes, "valor": r.valor} for r in results]

    def get_proveedores_data(self, db: Session, file_id: int, rubro: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        query = db.query(
            Presupuesto.proveedor,
            func.sum(Presupuesto.valor).label('valor')
        ).filter(Presupuesto.file_id == file_id)
        
        if rubro:
            query = query.filter(Presupuesto.rubro == rubro)
            
        query = query.group_by(Presupuesto.proveedor).order_by(desc('valor')).limit(limit)
        results = query.all()
        return [{"proveedor": r.proveedor or "(Vacío)", "valor": r.valor} for r in results]

presupuesto_repo = CRUDPresupuesto(Presupuesto)
