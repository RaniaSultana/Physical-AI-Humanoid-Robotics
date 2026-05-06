"""Flashcard API endpoints for spaced repetition learning."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.agents.flashcard_agent import get_flashcard_agent
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.flashcard import (
    DifficultyLevel,
    Flashcard,
    FlashcardDeck,
    FlashcardReview,
)
from src.models.user import User
from src.services.flashcard_service import (
    calculate_sm2,
    quality_from_rating,
    generate_anki_export,
    estimate_study_time,
)

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


# Request/Response Models
class GenerateDeckRequest(BaseModel):
    """Request to generate a new flashcard deck."""

    chapter_id: UUID
    card_count: int = Field(default=10, ge=1, le=30)
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"


class FlashcardResponse(BaseModel):
    """Single flashcard response."""

    id: UUID
    front: str
    back: str
    difficulty: str
    easiness_factor: float
    interval: int
    repetitions: int
    next_review_date: str
    is_due: bool
    is_new: bool
    is_mastered: bool


class DeckResponse(BaseModel):
    """Flashcard deck response."""

    id: UUID
    title: str
    description: str | None
    card_count: int
    due_count: int
    mastered_count: int
    created_at: str


class DeckDetailResponse(DeckResponse):
    """Flashcard deck with cards."""

    flashcards: list[FlashcardResponse]


class ReviewRequest(BaseModel):
    """Request to review a flashcard."""

    rating: Literal["again", "hard", "good", "easy"]
    response_time_ms: int | None = None


class ReviewResponse(BaseModel):
    """Response after reviewing a flashcard."""

    flashcard_id: UUID
    quality: int
    new_easiness_factor: float
    new_interval: int
    next_review_date: str
    cards_remaining: int


class DueCardsResponse(BaseModel):
    """Due cards for review."""

    total_due: int
    estimated_time: str
    flashcards: list[FlashcardResponse]


class DeckListResponse(BaseModel):
    """List of user's flashcard decks."""

    decks: list[DeckResponse]
    total: int
    total_due: int


# Endpoints
@router.post("/generate", response_model=DeckDetailResponse, status_code=status.HTTP_201_CREATED)
async def generate_deck(
    request: GenerateDeckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckDetailResponse:
    """Generate a new flashcard deck for a chapter using AI."""
    agent = get_flashcard_agent()

    # Get chapter slug (simplified)
    chapter_slug = str(request.chapter_id)

    # Generate flashcards
    result = await agent.generate_flashcards(
        chapter_slug=chapter_slug,
        card_count=request.card_count,
        difficulty=request.difficulty if request.difficulty != "mixed" else "medium",
    )

    if not result.flashcards:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate flashcards. Try a different chapter.",
        )

    # Create deck
    deck = FlashcardDeck(
        user_id=current_user.id,
        chapter_id=request.chapter_id,
        title=f"Flashcards: {chapter_slug}",
    )
    db.add(deck)
    await db.flush()

    # Create flashcards
    for card_data in result.flashcards:
        flashcard = Flashcard(
            deck_id=deck.id,
            front=card_data.front,
            back=card_data.back,
            difficulty=DifficultyLevel(card_data.difficulty),
            source_context=card_data.source_context,
        )
        db.add(flashcard)

    await db.commit()

    # Reload with flashcards
    query = select(FlashcardDeck).where(FlashcardDeck.id == deck.id).options(
        selectinload(FlashcardDeck.flashcards)
    )
    result = await db.execute(query)
    deck = result.scalar_one()

    return _deck_to_detail_response(deck)


@router.get("/decks", response_model=DeckListResponse)
async def list_decks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckListResponse:
    """List user's flashcard decks."""
    query = (
        select(FlashcardDeck)
        .where(FlashcardDeck.user_id == current_user.id)
        .order_by(FlashcardDeck.created_at.desc())
        .options(selectinload(FlashcardDeck.flashcards))
    )
    result = await db.execute(query)
    decks = result.scalars().all()

    total_due = sum(deck.due_count for deck in decks)

    return DeckListResponse(
        decks=[_deck_to_response(deck) for deck in decks],
        total=len(decks),
        total_due=total_due,
    )


@router.get("/decks/{deck_id}", response_model=DeckDetailResponse)
async def get_deck(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckDetailResponse:
    """Get a flashcard deck by ID."""
    query = (
        select(FlashcardDeck)
        .where(FlashcardDeck.id == deck_id)
        .where(FlashcardDeck.user_id == current_user.id)
        .options(selectinload(FlashcardDeck.flashcards))
    )
    result = await db.execute(query)
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found",
        )

    return _deck_to_detail_response(deck)


@router.delete("/decks/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deck(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a flashcard deck."""
    deck = await db.get(FlashcardDeck, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found",
        )

    await db.delete(deck)
    await db.commit()


@router.get("/due", response_model=DueCardsResponse)
async def get_due_cards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    deck_id: UUID | None = None,
    limit: int = 20,
) -> DueCardsResponse:
    """Get flashcards due for review."""
    now = datetime.now(timezone.utc)

    # Build query
    query = (
        select(Flashcard)
        .join(FlashcardDeck)
        .where(FlashcardDeck.user_id == current_user.id)
        .where(Flashcard.next_review_date <= now)
    )

    if deck_id:
        query = query.where(FlashcardDeck.id == deck_id)

    query = query.order_by(Flashcard.next_review_date).limit(limit)

    result = await db.execute(query)
    flashcards = result.scalars().all()

    # Get total count
    count_query = (
        select(Flashcard)
        .join(FlashcardDeck)
        .where(FlashcardDeck.user_id == current_user.id)
        .where(Flashcard.next_review_date <= now)
    )
    if deck_id:
        count_query = count_query.where(FlashcardDeck.id == deck_id)

    count_result = await db.execute(count_query)
    total_due = len(count_result.scalars().all())

    time_estimate = estimate_study_time(total_due)

    return DueCardsResponse(
        total_due=total_due,
        estimated_time=time_estimate['formatted'],
        flashcards=[_flashcard_to_response(fc) for fc in flashcards],
    )


@router.post("/review/{flashcard_id}", response_model=ReviewResponse)
async def review_flashcard(
    flashcard_id: UUID,
    request: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewResponse:
    """Submit a review for a flashcard using SM-2 algorithm."""
    # Get flashcard with deck
    query = (
        select(Flashcard)
        .join(FlashcardDeck)
        .where(Flashcard.id == flashcard_id)
        .where(FlashcardDeck.user_id == current_user.id)
    )
    result = await db.execute(query)
    flashcard = result.scalar_one_or_none()

    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found",
        )

    # Convert rating to quality
    quality = quality_from_rating(request.rating)

    # Record the review
    review = FlashcardReview(
        flashcard_id=flashcard.id,
        user_id=current_user.id,
        quality=quality,
        easiness_factor_before=flashcard.easiness_factor,
        interval_before=flashcard.interval,
        response_time_ms=request.response_time_ms,
    )
    db.add(review)

    # Calculate new SM-2 values
    sm2_result = calculate_sm2(
        quality=quality,
        easiness_factor=flashcard.easiness_factor,
        interval=flashcard.interval,
        repetitions=flashcard.repetitions,
    )

    # Update flashcard
    flashcard.easiness_factor = sm2_result.easiness_factor
    flashcard.interval = sm2_result.interval
    flashcard.repetitions = sm2_result.repetitions
    flashcard.next_review_date = sm2_result.next_review_date

    await db.commit()

    # Count remaining due cards
    now = datetime.now(timezone.utc)
    due_query = (
        select(Flashcard)
        .join(FlashcardDeck)
        .where(FlashcardDeck.user_id == current_user.id)
        .where(Flashcard.next_review_date <= now)
    )
    due_result = await db.execute(due_query)
    cards_remaining = len(due_result.scalars().all())

    return ReviewResponse(
        flashcard_id=flashcard.id,
        quality=quality,
        new_easiness_factor=sm2_result.easiness_factor,
        new_interval=sm2_result.interval,
        next_review_date=sm2_result.next_review_date.isoformat(),
        cards_remaining=cards_remaining,
    )


@router.get("/decks/{deck_id}/export")
async def export_deck_anki(
    deck_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export a deck in Anki-compatible format."""
    query = (
        select(FlashcardDeck)
        .where(FlashcardDeck.id == deck_id)
        .where(FlashcardDeck.user_id == current_user.id)
        .options(selectinload(FlashcardDeck.flashcards))
    )
    result = await db.execute(query)
    deck = result.scalar_one_or_none()

    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found",
        )

    cards = [
        {"front": fc.front, "back": fc.back}
        for fc in deck.flashcards
    ]

    content = generate_anki_export(deck.title, cards)

    return Response(
        content=content,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{deck.title}.txt"'
        },
    )


# Helper functions
def _flashcard_to_response(flashcard: Flashcard) -> FlashcardResponse:
    """Convert Flashcard model to response."""
    return FlashcardResponse(
        id=flashcard.id,
        front=flashcard.front,
        back=flashcard.back,
        difficulty=flashcard.difficulty.value,
        easiness_factor=flashcard.easiness_factor,
        interval=flashcard.interval,
        repetitions=flashcard.repetitions,
        next_review_date=flashcard.next_review_date.isoformat(),
        is_due=flashcard.is_due,
        is_new=flashcard.is_new,
        is_mastered=flashcard.is_mastered,
    )


def _deck_to_response(deck: FlashcardDeck) -> DeckResponse:
    """Convert FlashcardDeck model to response."""
    return DeckResponse(
        id=deck.id,
        title=deck.title,
        description=deck.description,
        card_count=deck.card_count,
        due_count=deck.due_count,
        mastered_count=deck.mastered_count,
        created_at=deck.created_at.isoformat(),
    )


def _deck_to_detail_response(deck: FlashcardDeck) -> DeckDetailResponse:
    """Convert FlashcardDeck model to detailed response."""
    return DeckDetailResponse(
        id=deck.id,
        title=deck.title,
        description=deck.description,
        card_count=deck.card_count,
        due_count=deck.due_count,
        mastered_count=deck.mastered_count,
        created_at=deck.created_at.isoformat(),
        flashcards=[_flashcard_to_response(fc) for fc in deck.flashcards],
    )
