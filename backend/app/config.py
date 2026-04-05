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
    # Worker self-service portal — longer access token life suits mobile PWA usage
    worker_portal_access_token_expire_minutes: int = 60

    b2_key_id: str = ""
    b2_app_key: str = ""
    b2_bucket_name: str = ""
    # Backblaze B2 S3-compatible endpoint, e.g. https://s3.us-west-004.backblazeb2.com
    b2_endpoint_url: str = ""

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@nexflow.work"
    frontend_url: str = "http://localhost:3000"
    # Comma-separated list of additional allowed CORS origins.
    # Set CORS_EXTRA_ORIGINS=https://nexflow.work on Railway production.
    cors_extra_origins: str = ""
    environment: str = "development"

    # OLX Business API (OAuth 2.0 client_credentials)
    olx_client_id: str = ""
    olx_client_secret: str = ""

    # Pracuj.pl XML feed
    pracuj_xml_feed_url: str = ""

    # Comma-separated "username:password" pairs for env-var-based dashboard access.
    # Example: DASHBOARD_USERS="nexflow0:pass0,nexflow1:pass1"
    # These are checked as a fallback when the user is not found in admin_users table.
    dashboard_users: str = ""

    # WhatsApp Business API (Meta Graph API v19.0)
    # Set all four in Railway / .env for the webhook to function.
    whatsapp_phone_number_id: str = ""         # WHATSAPP_PHONE_NUMBER_ID
    whatsapp_app_secret: str = ""              # WHATSAPP_APP_SECRET  (for X-Hub-Signature-256)
    whatsapp_access_token: str = ""            # WHATSAPP_ACCESS_TOKEN
    whatsapp_webhook_verify_token: str = ""    # WHATSAPP_WEBHOOK_VERIFY_TOKEN (self-chosen)


settings = Settings()
