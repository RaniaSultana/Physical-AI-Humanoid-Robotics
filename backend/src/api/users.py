"""User API endpoints including dashboard."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import BackgroundType, ExperienceLevel, User
from src.models.content import Chapter
from src.models.reading_progress import ReadingProgress
from src.models.quiz import QuizAttempt
from src.models.flashcard import FlashcardReview

router = APIRouter(prefix="/users", tags=["users"])


# Response Models
class CurrentChapter(BaseModel):
    """Current chapter info."""
    slug: str
    title: str
    progress: float


class ReadingProgressStats(BaseModel):
    """Reading progress statistics."""
    chaptersCompleted: int
    totalChapters: int
    percentComplete: int
    currentChapter: Optional[CurrentChapter] = None


class QuizStats(BaseModel):
    """Quiz statistics."""
    totalAttempts: int
    averageScore: float
    lastQuizDate: Optional[str] = None


class FlashcardStats(BaseModel):
    """Flashcard statistics."""
    totalCards: int
    dueToday: int
    masteredCards: int
    streakDays: int


class ActivityItem(BaseModel):
    """Recent activity item."""
    type: str  # 'read', 'quiz', 'flashcard', 'chat'
    title: str
    timestamp: str
    detail: Optional[str] = None


class DashboardResponse(BaseModel):
    """Dashboard data response."""
    readingProgress: ReadingProgressStats
    quizStats: QuizStats
    flashcardStats: FlashcardStats
    recentActivity: List[ActivityItem]


class BackgroundUpdateRequest(BaseModel):
    """Background update request."""
    background_type: BackgroundType
    background_other: Optional[str] = None
    software_experience: Optional[ExperienceLevel] = None
    hardware_experience: Optional[ExperienceLevel] = None
    learning_goals: Optional[str] = None


class UserResponse(BaseModel):
    """User response."""
    id: UUID
    email: str
    display_name: Optional[str]
    background_type: Optional[str]
    software_experience: Optional[str]
    hardware_experience: Optional[str]
    learning_goals: Optional[str]
    preferred_language: str
    role: str
    has_background: bool
    created_at: str

    class Config:
        from_attributes = True


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    """Get dashboard data for the current user."""

    # Get total chapters count
    total_chapters_result = await db.execute(
        select(func.count(Chapter.id)).where(Chapter.status == "PUBLISHED")
    )
    total_chapters = total_chapters_result.scalar() or 0

    # Get completed chapters count
    completed_result = await db.execute(
        select(func.count(ReadingProgress.id))
        .where(ReadingProgress.user_id == current_user.id)
        .where(ReadingProgress.completed == True)
    )
    completed_chapters = completed_result.scalar() or 0

    # Calculate percent complete
    percent_complete = int((completed_chapters / total_chapters * 100) if total_chapters > 0 else 0)

    # Get current chapter (last accessed, not completed)
    current_chapter = None
    last_progress_result = await db.execute(
        select(ReadingProgress, Chapter)
        .join(Chapter, ReadingProgress.chapter_id == Chapter.id)
        .where(ReadingProgress.user_id == current_user.id)
        .where(ReadingProgress.completed == False)
        .order_by(ReadingProgress.last_accessed_at.desc())
        .limit(1)
    )
    last_progress = last_progress_result.first()
    if last_progress:
        progress, chapter = last_progress
        current_chapter = CurrentChapter(
            slug=chapter.slug,
            title=chapter.title,
            progress=progress.scroll_position or 0
        )

    # Get quiz stats
    quiz_result = await db.execute(
        select(
            func.count(QuizAttempt.id),
            func.avg(QuizAttempt.score),
            func.max(QuizAttempt.completed_at)
        )
        .where(QuizAttempt.user_id == current_user.id)
    )
    quiz_row = quiz_result.first()
    quiz_attempts = quiz_row[0] or 0
    quiz_avg = float(quiz_row[1] or 0)
    last_quiz = quiz_row[2]

    # Get flashcard stats
    flashcard_result = await db.execute(
        select(func.count(FlashcardReview.id))
        .where(FlashcardReview.user_id == current_user.id)
    )
    total_reviews = flashcard_result.scalar() or 0

    # Build response
    return DashboardResponse(
        readingProgress=ReadingProgressStats(
            chaptersCompleted=completed_chapters,
            totalChapters=total_chapters,
            percentComplete=percent_complete,
            currentChapter=current_chapter
        ),
        quizStats=QuizStats(
            totalAttempts=quiz_attempts,
            averageScore=round(quiz_avg, 1),
            lastQuizDate=last_quiz.isoformat() if last_quiz else None
        ),
        flashcardStats=FlashcardStats(
            totalCards=0,  # Would need to count user's flashcards
            dueToday=0,    # Would need to check due dates
            masteredCards=0,
            streakDays=0
        ),
        recentActivity=[]  # Would need to aggregate from multiple tables
    )


@router.put("/background", response_model=UserResponse)
async def update_background(
    request: BackgroundUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update the current user's educational background."""
    current_user.background_type = request.background_type
    current_user.background_other = request.background_other
    current_user.software_experience = request.software_experience
    current_user.hardware_experience = request.hardware_experience
    current_user.learning_goals = request.learning_goals

    await db.commit()
    await db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        background_type=current_user.background_type.value if current_user.background_type else None,
        software_experience=current_user.software_experience.value if current_user.software_experience else None,
        hardware_experience=current_user.hardware_experience.value if current_user.hardware_experience else None,
        learning_goals=current_user.learning_goals,
        preferred_language=current_user.preferred_language,
        role=current_user.role.value,
        has_background=current_user.has_background,
        created_at=current_user.created_at.isoformat(),
    )
