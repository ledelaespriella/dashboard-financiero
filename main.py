"""
Dashboard Financiero - Backend FastAPI
Procesa archivos Excel (.xlsx) con datos presupuestarios y retorna JSON.
"""

import io
import math
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pandas as pd

app = FastAPI(title="Dashboard Financiero", version="1.0.0")

# ---------------------------------------------------------------------------
# Campos esperados en el Excel
# ---------------------------------------------------------------------------
EXPECTED_FIELDS = [
    "PROVEEDOR", "RUBRO", "COSTO MES", "BASE", "IVA",
    "RETENCION", "CRUCE ANTICIPOS", "VALOR", "OBSERVACION",
    "TIPO", "PRESUPUESTO"
]

NUMERIC_FIELDS = [
    "COSTO MES", "BASE", "IVA", "RETENCION",
    "CRUCE ANTICIPOS", "VALOR"
]


def sanitize_value(val):
    """Convierte NaN / Infinity a None para serialización JSON segura."""
    if val is None:
        return None
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    return val


# ---------------------------------------------------------------------------
# Endpoint de carga
# ---------------------------------------------------------------------------
@app.post("/api/upload")
async def upload_excel(file: UploadFile = File(...)):
    # Validar extensión
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Por favor suba un archivo .xlsx"
        )

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Error al leer el archivo Excel: {str(exc)}"
        )

    # Normalizar nombres de columnas (mayúsculas, sin espacios extra)
    df.columns = [col.strip().upper() for col in df.columns]

    # Verificar campos requeridos
    missing = [f for f in EXPECTED_FIELDS if f not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan las columnas: {', '.join(missing)}. "
                   f"Columnas encontradas: {', '.join(df.columns.tolist())}"
        )

    # Convertir campos numéricos
    for field in NUMERIC_FIELDS:
        df[field] = pd.to_numeric(df[field], errors="coerce").fillna(0)

    # Convertir campos de texto (manejar NaN como cadena vacía)
    for field in ["PROVEEDOR", "RUBRO", "OBSERVACION", "TIPO", "PRESUPUESTO"]:
        df[field] = df[field].fillna("").astype(str).str.strip()
        df[field] = df[field].replace({"nan": "", "None": "", "none": ""})

    # Normalizar RUBRO a Title Case para evitar duplicados por capitalización
    df["RUBRO"] = df["RUBRO"].str.title()
    # Normalizar PROVEEDOR y TIPO a Title Case
    df["PROVEEDOR"] = df["PROVEEDOR"].str.upper()
    df["TIPO"] = df["TIPO"].str.title()

    # Construir respuesta
    records = []
    for _, row in df.iterrows():
        record = {}
        for col in EXPECTED_FIELDS:
            record[col] = sanitize_value(row[col])
        records.append(record)

    # Resumen global
    summary = {
        "total_valor": sanitize_value(float(df["VALOR"].sum())),
        "total_base": sanitize_value(float(df["BASE"].sum())),
        "total_iva": sanitize_value(float(df["IVA"].sum())),
        "total_retencion": sanitize_value(float(df["RETENCION"].sum())),
        "total_cruce_anticipos": sanitize_value(float(df["CRUCE ANTICIPOS"].sum())),
        "total_registros": len(df),
        "rubros": sorted([r for r in df["RUBRO"].unique().tolist() if r]),
        "proveedores": sorted([p for p in df["PROVEEDOR"].unique().tolist() if p]),
        "tipos": sorted([t for t in df["TIPO"].unique().tolist() if t]),
        "presupuestos": sorted([p for p in df["PRESUPUESTO"].unique().tolist() if p]),
    }

    return {"records": records, "summary": summary}


# ---------------------------------------------------------------------------
# Servir frontend
# ---------------------------------------------------------------------------
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return FileResponse("static/index.html")


# ---------------------------------------------------------------------------
# Arranque
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
