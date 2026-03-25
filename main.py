from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import ProgrammingError

from app.core.config import settings
from app.core.database import Base, engine
from app.api.endpoints import router as api_router

# Inicialización de la base de datos
try:
    Base.metadata.create_all(bind=engine)
except ProgrammingError:
    pass # Ignorar si ya existe u otro error, se manejará en logs normalmente

app = FastAPI(title=settings.PROJECT_NAME)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(api_router, prefix="/api", tags=["dashboard"])

# Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
