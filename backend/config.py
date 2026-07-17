from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    gemini_api_key: Optional[str] = None
    sarvam_api_key: Optional[str] = None
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topic: str = "climate_events"
    api_url: str = "http://127.0.0.1:8000"
    environment: str = "development"
    debug: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
