"""Conversation and Message models for AI Q&A chat."""
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


class MessageRole(str, enum.Enum):
    """Role of the message sender."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ContextMode(str, enum.Enum):
    """Context mode for Q&A."""

    CHAPTER = "chapter"  # Questions about current chapter
    COURSE = "course"  # Questions about entire course
    SELECTION = "selection"  # Questions about selected text (Highlight & Ask)


class Conversation(Base, TimestampMixin):
    """Conversation model for tracking chat sessions."""

    __tablename__ = "conversations"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chapter_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("chapters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        nullable=False,
        default="New Conversation",
    )
    is_active: Mapped[bool] = mapped_column(
        nullable=False,
        default=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:
        return f"<Conversation(id={self.id}, title={self.title})>"


class Citation(Base):
    """Citation model for tracking sources used in AI responses."""

    __tablename__ = "citations"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    message_id: Mapped[UUID] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chapter_slug: Mapped[str] = mapped_column(nullable=False)
    section_title: Mapped[str] = mapped_column(nullable=False)
    content_preview: Mapped[str] = mapped_column(Text, nullable=False)
    relevance_score: Mapped[float] = mapped_column(nullable=False)
    chunk_index: Mapped[int] = mapped_column(nullable=False)

    # Relationships
    message: Mapped["Message"] = relationship(back_populates="citations")

    def __repr__(self) -> str:
        return f"<Citation(id={self.id}, chapter={self.chapter_slug})>"


class Message(Base, TimestampMixin):
    """Message model for individual chat messages."""

    __tablename__ = "messages"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    conversation_id: Mapped[UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[MessageRole] = mapped_column(
        nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    context_mode: Mapped[Optional[ContextMode]] = mapped_column(
        nullable=True,
    )
    selected_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    # Store raw context chunks used for this response (for debugging/transparency)
    context_chunks: Mapped[Optional[Dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    # Token usage tracking
    prompt_tokens: Mapped[Optional[int]] = mapped_column(nullable=True)
    completion_tokens: Mapped[Optional[int]] = mapped_column(nullable=True)

    # Relationships
    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    citations: Mapped[list["Citation"]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Message(id={self.id}, role={self.role})>"
