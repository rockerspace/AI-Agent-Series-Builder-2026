import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    gemini_api_key: Optional[str] = None
    sarvam_api_key: Optional[str] = None
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topic: str = "climate-events"
    firebase_service_account_path: Optional[str] = None
    api_url: str = "http://127.0.0.1:8000"
    environment: str = "development"
    debug: bool = True
    
    # HashiCorp Vault credentials (optional, used in production builds)
    vault_addr: Optional[str] = None
    vault_token: Optional[str] = None
    vault_secret_path: str = "secret/data/ecopulse"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Load basic configurations from environment or .env file
settings = Settings()

# If Vault configurations are provided, attempt to fetch secrets dynamically
if settings.vault_addr and settings.vault_token:
    try:
        import hvac
        print(f"🔐 Initializing connection to HashiCorp Vault: {settings.vault_addr}")
        client = hvac.Client(url=settings.vault_addr, token=settings.vault_token)
        
        # Read the secret payload from Vault KV engine
        secret_response = client.read(settings.vault_secret_path)
        if secret_response and "data" in secret_response:
            payload = secret_response["data"]
            # Support both KV V1 and KV V2 engine structures
            data_payload = payload.get("data", payload) if "data" in payload else payload
            
            # Dynamically override the settings with Vault values
            if "GEMINI_API_KEY" in data_payload:
                settings.gemini_api_key = data_payload["GEMINI_API_KEY"]
                print("✓ Loaded GEMINI_API_KEY from HashiCorp Vault")
            if "SARVAM_API_KEY" in data_payload:
                settings.sarvam_api_key = data_payload["SARVAM_API_KEY"]
                print("✓ Loaded SARVAM_API_KEY from HashiCorp Vault")
        else:
            print(f"⚠️ Vault returned empty payload at path: {settings.vault_secret_path}")
    except ImportError:
        print("⚠️ hvac package not installed. Skipping Vault integration.")
    except Exception as e:
        print(f"⚠️ Failed to load production secrets from HashiCorp Vault: {e}")

