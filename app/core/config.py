import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dashboard Financiero API"
    
    # DATABASE URL from environment or default to a local SQLite for local dev if not running in Docker
    # (Though Docker will inject postgresql via docker-compose)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./local_db.sqlite")

settings = Settings()
