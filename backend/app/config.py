from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://localhost/nexflow"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str  # Required — set JWT_SECRET_KEY in environment; no default allowed
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cookie_secure: bool = False  # Set True in production (requires HTTPS)

    b2_key_id: str = ""
    b2_app_key: str = ""
    b2_bucket_name: str = ""

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    sendgrid_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    # OLX Business API (OAuth 2.0 client_credentials)
    olx_client_id: str = ""
    olx_client_secret: str = ""

    # Pracuj.pl XML feed
    pracuj_xml_feed_url: str = ""


settings = Settings()
