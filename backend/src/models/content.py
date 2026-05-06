"""Content models: Chapter and ContentChunk."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.reading_progress import ReadingProgress
    from src.models.code_execution import CodeExecution


class ContentStatus(str, enum.Enum):
    """Content publication status."""

    DRAFT = "draft"
    PUBLISHED = "published"


class Chapter(Base, TimestampMixin):
    """Chapter model with hierarchical structure."""

    __tablename__ = "chapters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Hierarchy
    course_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="physical-ai-robotics",
    )
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    module_number: Mapped[int] = mapped_column(Integer, nullable=False)
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Content reference
    slug: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    # Metadata
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimated_read_time: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Status (FR-019)
    status: Mapped[ContentStatus] = mapped_column(
        Enum(ContentStatus),
        default=ContentStatus.DRAFT,
        nullable=False,
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    reading_progress: Mapped[list["ReadingProgress"]] = relationship(
        "ReadingProgress",
        back_populates="chapter",
        cascade="all, delete-orphan",
    )
    chunks: Mapped[list["ContentChunk"]] = relationship(
        "ContentChunk",
        back_populates="chapter",
        cascade="all, delete-orphan",
    )
    code_executions: Mapped[list["CodeExecution"]] = relationship(
        "CodeExecution",
        back_populates="chapter",
    )

    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "week_number",
            "module_number",
            "chapter_number",
            name="uq_chapter_position",
        ),
    )

    def __repr__(self) -> str:
        return f"<Chapter {self.slug}>"


class ContentChunk(Base):
    """Content chunk for Qdrant sync and vector search."""

    __tablename__ = "content_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    chapter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Chunk identification
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    section_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Content
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Qdrant sync
    qdrant_point_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    embedded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default="now()",
        nullable=False,
    )

    # Relationships
    chapter: Mapped["Chapter"] = relationship("Chapter", back_populates="chunks")

    __table_args__ = (
        UniqueConstraint("chapter_id", "chunk_index", name="uq_chunk_index"),
    )

    def __repr__(self) -> str:
        return f"<ContentChunk {self.chapter_id}:{self.chunk_index}>"
