from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:test@localhost:5432/mandorhub"
    jwt_secret: str = "dev-secret-change-me"
    jwt_alg: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 hari
    # Dev only: kembalikan kode OTP di response. WAJIB false di produksi.
    otp_dev_mode: bool = True
    cors_origins: str = "*"


settings = Settings()
