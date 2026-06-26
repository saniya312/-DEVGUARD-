from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    SECRET_KEY: str = "devguard-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    GROQ_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./devguard.db"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()