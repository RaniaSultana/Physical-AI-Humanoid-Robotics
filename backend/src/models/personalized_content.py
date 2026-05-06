"""Models for personalized and translated content."""
from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional, Dict
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Text, text
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.user import User


class ContentLanguage(str, enum.Enum):
    """Supported content languages."""

    ENGLISH = "en"
    URDU = "ur"


class PersonalizationType(str, enum.Enum):
    """Type of content personalization."""

    TRANSLATION = "translation"
    BACKGROUND_ADAPTATION = "background_adaptation"
    INTEREST_BASED = "interest_based"


class TranslatedContent(Base, TimestampMixin):
    """Cached translated content for chapters."""

    __tablename__ = "translated_content"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    chapter_id: Mapped[UUID] = mapped_column(
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_language: Mapped[ContentLanguage] = mapped_column(
        nullable=False,
        default=ContentLanguage.ENGLISH,
    )
    target_language: Mapped[ContentLanguage] = mapped_column(
        nullable=False,
    )
    # Original content hash for cache invalidation
    content_hash: Mapped[str] = mapped_column(nullable=False)
    # Translated content
    translated_title: Mapped[str] = mapped_column(nullable=False)
    translated_content: Mapped[str] = mapped_column(Text, nullable=False)
    # Token usage for cost tracking
    tokens_used: Mapped[Optional[int]] = mapped_column(nullable=True)

    def __repr__(self) -> str:
        return f"<TranslatedContent(id={self.id}, lang={self.target_language})>"


class PersonalizedContent(Base, TimestampMixin):
    """User-specific personalized chapter content."""

    __tablename__ = "personalized_content"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    chapter_id: Mapped[UUID] = mapped_column(
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    personalization_type: Mapped[PersonalizationType] = mapped_column(
        nullable=False,
    )
    # Content hash for cache lookup
    content_hash: Mapped[Optional[str]] = mapped_column(nullable=True, index=True)
    # Personalization parameters used
    parameters: Mapped[Optional[Dict]] = mapped_column(JSON, nullable=True)
    # Personalized content
    personalized_title: Mapped[Optional[str]] = mapped_column(nullable=True)
    personalized_content: Mapped[str] = mapped_column(Text, nullable=False)
    # Token usage for cost tracking
    tokens_used: Mapped[Optional[int]] = mapped_column(nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="personalized_content")

    def __repr__(self) -> str:
        return f"<PersonalizedContent(id={self.id}, type={self.personalization_type})>"
