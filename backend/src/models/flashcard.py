"""Flashcard models for spaced repetition learning."""
from __future__ import annotations

import enum
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Optional, List
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.user import User


class DifficultyLevel(str, enum.Enum):
    """Difficulty level of flashcards."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class FlashcardDeck(Base, TimestampMixin):
    """Flashcard deck model for organizing flashcards by chapter."""

    __tablename__ = "flashcard_decks"

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
    chapter_id: Mapped[UUID] = mapped_column(
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="flashcard_decks")
    flashcards: Mapped[List["Flashcard"]] = relationship(
        back_populates="deck",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<FlashcardDeck(id={self.id}, title={self.title})>"

    @property
    def card_count(self) -> int:
        """Get total number of cards in the deck."""
        return len(self.flashcards)

    @property
    def due_count(self) -> int:
        """Get number of cards due for review."""
        now = datetime.utcnow()
        return sum(1 for card in self.flashcards if card.next_review_date <= now)

    @property
    def mastered_count(self) -> int:
        """Get number of mastered cards (interval > 21 days)."""
        return sum(1 for card in self.flashcards if card.interval > 21)


class Flashcard(Base, TimestampMixin):
    """Flashcard model with SM-2 spaced repetition fields."""

    __tablename__ = "flashcards"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    deck_id: Mapped[UUID] = mapped_column(
        ForeignKey("flashcard_decks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[DifficultyLevel] = mapped_column(
        nullable=False,
        default=DifficultyLevel.MEDIUM,
    )
    # Source context from the textbook
    source_context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # SM-2 algorithm fields
    easiness_factor: Mapped[float] = mapped_column(
        nullable=False,
        default=2.5,  # Initial EF per SM-2
    )
    interval: Mapped[int] = mapped_column(
        nullable=False,
        default=0,  # Days until next review
    )
    repetitions: Mapped[int] = mapped_column(
        nullable=False,
        default=0,  # Number of successful reviews
    )
    next_review_date: Mapped[datetime] = mapped_column(
        nullable=False,
        default=datetime.utcnow,
    )

    # Relationships
    deck: Mapped["FlashcardDeck"] = relationship(back_populates="flashcards")
    reviews: Mapped[List["FlashcardReview"]] = relationship(
        back_populates="flashcard",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Flashcard(id={self.id}, front={self.front[:30]}...)>"

    @property
    def is_due(self) -> bool:
        """Check if the card is due for review."""
        return self.next_review_date <= datetime.utcnow()

    @property
    def is_new(self) -> bool:
        """Check if the card has never been reviewed."""
        return self.repetitions == 0

    @property
    def is_mastered(self) -> bool:
        """Check if the card is considered mastered."""
        return self.interval > 21


class FlashcardReview(Base, TimestampMixin):
    """Review record for tracking flashcard study sessions."""

    __tablename__ = "flashcard_reviews"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    flashcard_id: Mapped[UUID] = mapped_column(
        ForeignKey("flashcards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Quality rating from 0-5 (SM-2 scale)
    # 0-2: Incorrect response
    # 3: Correct with difficulty
    # 4: Correct with hesitation
    # 5: Perfect recall
    quality: Mapped[int] = mapped_column(nullable=False)
    # Snapshot of card state before review
    easiness_factor_before: Mapped[float] = mapped_column(nullable=False)
    interval_before: Mapped[int] = mapped_column(nullable=False)
    # Time taken to respond (milliseconds)
    response_time_ms: Mapped[Optional[int]] = mapped_column(nullable=True)

    # Relationships
    flashcard: Mapped["Flashcard"] = relationship(back_populates="reviews")
    user: Mapped["User"] = relationship(back_populates="flashcard_reviews")

    def __repr__(self) -> str:
        return f"<FlashcardReview(id={self.id}, quality={self.quality})>"
