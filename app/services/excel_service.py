import pandas as pd
import numpy as np
import io
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.repositories.presupuesto_repo import presupuesto_repo
from app.repositories.file_metadata_repo import file_metadata_repo
from app.schemas.file_metadata import FileMetadataCreate

EXPECTED_COLUMNS = [
    'PROVEEDOR', 'RUBRO', 'TIPO', 'COSTO MES', 'BASE', 'IVA', 
    'RETENCION', 'CRUCE ANTICIPOS', 'VALOR', 'PRESUPUESTO', 'OBSERVACION'
]

NUMERIC_FIELDS = ['COSTO MES', 'BASE', 'IVA', 'RETENCION', 'CRUCE ANTICIPOS', 'VALOR']
TEXT_FIELDS = ['PROVEEDOR', 'RUBRO', 'TIPO', 'PRESUPUESTO', 'OBSERVACION']

class ExcelService:
    @staticmethod
    def process_and_store(file: UploadFile, db: Session):
        try:
            contents = file.file.read()
            df = pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al leer el archivo Excel: {str(e)}")
        
        # Validar columnas
        missing_cols = [col for col in EXPECTED_COLUMNS if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Faltan las siguientes columnas: {', '.join(missing_cols)}")
        
        # Limpieza de datos numéricos
        for col in NUMERIC_FIELDS:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
        # Limpieza de datos textuales
        for col in TEXT_FIELDS:
            df[col] = df[col].fillna('')
            df[col] = df[col].astype(str).str.strip()
            # Si están vacíos dejarlos como string vacío, luego tratarlos
            
        # Normalización específica
        df['RUBRO'] = df['RUBRO'].str.title()
        df['PROVEEDOR'] = df['PROVEEDOR'].str.upper()
        df['TIPO'] = df['TIPO'].str.title()
        
        # Opcional: reemplazar strings vacíos por None o cadena predeterminada
        df.replace('', None, inplace=True)
        
        # Convertir a lista de diccionarios
        records_dict = df[EXPECTED_COLUMNS].to_dict(orient='records')
        
        # Mapear a los nombres del DB model
        mapped_records = []
        for r in records_dict:
            mapped_records.append({
                "proveedor": r['PROVEEDOR'],
                "rubro": r['RUBRO'],
                "tipo": r['TIPO'],
                "costo_mes": r['COSTO MES'],
                "base": r['BASE'],
                "iva": r['IVA'],
                "retencion": r['RETENCION'],
                "cruce_anticipos": r['CRUCE ANTICIPOS'],
                "valor": r['VALOR'],
                "presupuesto_cat": r['PRESUPUESTO'],
                "observacion": r['OBSERVACION']
            })
            
        # Iniciar transacción de almacenamiento
        # 1. Crear metadata del archivo
        metadata_in = FileMetadataCreate(filename=file.filename, total_registros=len(mapped_records))
        file_db = file_metadata_repo.create(db, obj_in=metadata_in)
        
        # 2. Bulk insert de presupuestos
        presupuesto_repo.bulk_create(db, mapped_records, file_db.id)
        
        return {
            "message": "Archivo procesado y almacenado correctamente",
            "total_registros": len(mapped_records),
            "filename": file.filename
        }
