from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://pixel:pixel@127.0.0.1:5432/pixel_battle"
    redis_url: str = "redis://127.0.0.1:6379/0"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8787,http://127.0.0.1:8787"
    session_cookie_secure: bool = False
    session_ttl_seconds: int = 604800
    cooldown_seconds: int = Field(default=5, ge=1, le=3600)
    board_size: Literal[256] = 256
    log_level: str = "info"

    @property
    def origins(self) -> set[str]:
        return {origin.strip().rstrip("/") for origin in self.allowed_origins.split(",")}


@lru_cache
def get_settings() -> Settings:
    return Settings()
