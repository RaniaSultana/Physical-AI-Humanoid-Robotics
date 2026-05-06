"""Application configuration using Pydantic settings."""
from __future__ import annotations

from functools import lru_cache
from typing import List, Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "AI Textbook Platform"
    debug: bool = False
    environment: Literal["development", "staging", "production"] = "development"

    # API
    api_v1_prefix: str = "/api/v1"
    cors_origins: List[str] = ["http://localhost:3000"]

    # Database (SQLite for local, Neon PostgreSQL for production)
    database_url: str = "sqlite+aiosqlite:///./textbook.db"

    # Vector Database (Qdrant Cloud)
    qdrant_url: str = "https://86e5c0ef-5cd4-48d3-afc9-11cec4bd5ec7.us-east4-0.gcp.cloud.qdrant.io:6333"
    qdrant_api_key: Optional[str] = None
    qdrant_collection: str = "textbook_content"

    # AI Provider Configuration
    ai_provider: Literal["openai", "gemini", "openrouter"] = "openrouter"

    # OpenRouter (recommended - access to multiple models)
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemini-2.0-flash-exp:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Gemini (alternative)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash-exp"
    gemini_embedding_model: str = "text-embedding-004"

    # OpenAI (alternative)
    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"

    # Authentication
    jwt_secret: str = "change-this-secret-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # OAuth - Google
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"

    # OAuth - GitHub
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None
    github_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/github/callback"

    # Frontend URL for OAuth redirects
    frontend_url: str = "http://localhost:3000"

    @property
    def async_database_url(self) -> str:
        """Ensure database URL uses async driver."""
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
