"""Content API endpoints for chapters and reading progress."""
from __future__ import annotations

import uuid as uuid_lib
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_session
from src.core.dependencies import AuthorUser, CurrentUser, CurrentUserOptional
from src.models.content import Chapter, ContentChunk, ContentStatus
from src.models.reading_progress import ReadingProgress
from src.services.embedding_service import chunk_text, generate_embeddings
from src.services.qdrant_client import get_qdrant_client
from src.core.config import settings

router = APIRouter(prefix="/content", tags=["content"])


# Pydantic schemas
class ChapterSummary(BaseModel):
    """Summary of a chapter for listing."""

    id: UUID
    chapter_number: int
    slug: str
    title: str
    estimated_read_time: int | None

    class Config:
        from_attributes = True


class ChapterDetail(ChapterSummary):
    """Full chapter details."""

    week_number: int
    module_number: int
    word_count: int | None
    status: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ModuleNode(BaseModel):
    """Module containing chapters."""

    module_number: int
    title: str
    chapters: list[ChapterSummary]


class WeekNode(BaseModel):
    """Week containing modules."""

    week_number: int
    title: str
    modules: list[ModuleNode]


class ChapterTree(BaseModel):
    """Hierarchical chapter structure."""

    course_id: str
    course_title: str
    weeks: list[WeekNode]


class ReadingProgressResponse(BaseModel):
    """Reading progress for a chapter."""

    chapter_id: UUID
    scroll_position: float
    completed: bool
    completed_at: datetime | None
    total_time_seconds: int
    last_accessed_at: datetime

    class Config:
        from_attributes = True


class ProgressList(BaseModel):
    """List of reading progress with summary."""

    progress: list[ReadingProgressResponse]
    total_chapters: int
    completed_chapters: int
    overall_completion: float


class UpdateProgressRequest(BaseModel):
    """Request to update reading progress."""

    scroll_position: float | None = Field(None, ge=0.0, le=1.0)
    time_spent_seconds: int | None = Field(None, ge=0)


# Content endpoints
@router.get("/chapters", response_model=ChapterTree)
async def list_chapters(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    week: int | None = Query(None, description="Filter by week number"),
    include_drafts: bool = Query(False, description="Include draft chapters (author only)"),
    current_user: CurrentUserOptional = None,
) -> ChapterTree:
    """
    Get hierarchical list of all published chapters (FR-001).

    Returns chapters organized by weeks and modules.
    """
    # Build query
    query = select(Chapter)

    if week:
        query = query.where(Chapter.week_number == week)

    # Only show published unless author requests drafts
    if not include_drafts or current_user is None or current_user.role != "author":
        query = query.where(Chapter.status == ContentStatus.PUBLISHED)

    query = query.order_by(
        Chapter.week_number,
        Chapter.module_number,
        Chapter.chapter_number,
    )

    result = await session.execute(query)
    chapters = result.scalars().all()

    # Build hierarchical structure
    weeks_dict: dict[int, WeekNode] = {}

    for chapter in chapters:
        # Get or create week
        if chapter.week_number not in weeks_dict:
            weeks_dict[chapter.week_number] = WeekNode(
                week_number=chapter.week_number,
                title=f"Week {chapter.week_number}",
                modules=[],
            )

        week_node = weeks_dict[chapter.week_number]

        # Get or create module
        module_node = next(
            (m for m in week_node.modules if m.module_number == chapter.module_number),
            None,
        )
        if module_node is None:
            module_node = ModuleNode(
                module_number=chapter.module_number,
                title=f"Module {chapter.module_number}",
                chapters=[],
            )
            week_node.modules.append(module_node)

        # Add chapter
        module_node.chapters.append(
            ChapterSummary(
                id=chapter.id,
                chapter_number=chapter.chapter_number,
                slug=chapter.slug,
                title=chapter.title,
                estimated_read_time=chapter.estimated_read_time,
            )
        )

    return ChapterTree(
        course_id="physical-ai-robotics",
        course_title="Physical AI & Humanoid Robotics",
        weeks=sorted(weeks_dict.values(), key=lambda w: w.week_number),
    )


@router.get("/chapters/{slug:path}", response_model=ChapterDetail)
async def get_chapter_by_slug(
    slug: str,
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> ChapterDetail:
    """
    Get chapter metadata by its URL slug.

    The slug format is: week-XX/module-XX/chapter-name
    """
    result = await session.execute(select(Chapter).where(Chapter.slug == slug))
    chapter = result.scalar_one_or_none()

    if chapter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chapter not found: {slug}",
        )

    return ChapterDetail(
        id=chapter.id,
        chapter_number=chapter.chapter_number,
        slug=chapter.slug,
        title=chapter.title,
        estimated_read_time=chapter.estimated_read_time,
        week_number=chapter.week_number,
        module_number=chapter.module_number,
        word_count=chapter.word_count,
        status=chapter.status.value,
        published_at=chapter.published_at,
        created_at=chapter.created_at,
        updated_at=chapter.updated_at,
    )


# Progress endpoints
@router.get("/progress", response_model=ProgressList)
async def get_all_progress(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: CurrentUser,
) -> ProgressList:
    """
    Get reading progress for all chapters (FR-011).
    """
    # Get all progress for user
    progress_result = await session.execute(
        select(ReadingProgress).where(ReadingProgress.user_id == current_user.id)
    )
    progress_list = progress_result.scalars().all()

    # Count total published chapters
    total_result = await session.execute(
        select(func.count()).select_from(Chapter).where(Chapter.status == ContentStatus.PUBLISHED)
    )
    total_chapters = total_result.scalar() or 0

    # Count completed
    completed_chapters = sum(1 for p in progress_list if p.completed)

    # Calculate overall completion
    overall_completion = completed_chapters / total_chapters if total_chapters > 0 else 0.0

    return ProgressList(
        progress=[ReadingProgressResponse.model_validate(p) for p in progress_list],
        total_chapters=total_chapters,
        completed_chapters=completed_chapters,
        overall_completion=overall_completion,
    )


@router.get("/progress/{chapter_id}", response_model=ReadingProgressResponse)
async def get_chapter_progress(
    chapter_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: CurrentUser,
) -> ReadingProgressResponse:
    """Get reading progress for a specific chapter."""
    result = await session.execute(
        select(ReadingProgress).where(
            ReadingProgress.user_id == current_user.id,
            ReadingProgress.chapter_id == chapter_id,
        )
    )
    progress = result.scalar_one_or_none()

    if progress is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No progress recorded for this chapter",
        )

    return ReadingProgressResponse.model_validate(progress)


@router.put("/progress/{chapter_id}", response_model=ReadingProgressResponse)
async def update_chapter_progress(
    chapter_id: UUID,
    request: UpdateProgressRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: CurrentUser,
) -> ReadingProgressResponse:
    """Save or update reading progress for a chapter."""
    # Check chapter exists
    chapter_result = await session.execute(select(Chapter).where(Chapter.id == chapter_id))
    if chapter_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    # Get or create progress
    result = await session.execute(
        select(ReadingProgress).where(
            ReadingProgress.user_id == current_user.id,
            ReadingProgress.chapter_id == chapter_id,
        )
    )
    progress = result.scalar_one_or_none()

    if progress is None:
        progress = ReadingProgress(
            user_id=current_user.id,
            chapter_id=chapter_id,
        )
        session.add(progress)

    # Update progress
    if request.scroll_position is not None:
        progress.scroll_position = request.scroll_position

    if request.time_spent_seconds is not None:
        progress.total_time_seconds += request.time_spent_seconds

    progress.last_accessed_at = datetime.now()

    await session.flush()
    await session.refresh(progress)

    return ReadingProgressResponse.model_validate(progress)


@router.post("/progress/{chapter_id}/complete", response_model=ReadingProgressResponse)
async def mark_chapter_complete(
    chapter_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: CurrentUser,
) -> ReadingProgressResponse:
    """Mark a chapter as completed."""
    # Check chapter exists
    chapter_result = await session.execute(select(Chapter).where(Chapter.id == chapter_id))
    if chapter_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    # Get or create progress
    result = await session.execute(
        select(ReadingProgress).where(
            ReadingProgress.user_id == current_user.id,
            ReadingProgress.chapter_id == chapter_id,
        )
    )
    progress = result.scalar_one_or_none()

    if progress is None:
        progress = ReadingProgress(
            user_id=current_user.id,
            chapter_id=chapter_id,
        )
        session.add(progress)

    progress.mark_complete()

    await session.flush()
    await session.refresh(progress)

    return ReadingProgressResponse.model_validate(progress)


# ============================================================================
# Authoring endpoints (T105, T106, T107, T111)
# ============================================================================


class CreateChapterRequest(BaseModel):
    """Request to create a new chapter."""

    week_number: int = Field(..., ge=1, description="Week number in the course")
    module_number: int = Field(..., ge=1, description="Module number within the week")
    chapter_number: int = Field(..., ge=1, description="Chapter number within the module")
    slug: str = Field(..., min_length=1, max_length=255, description="URL-friendly identifier")
    title: str = Field(..., min_length=1, max_length=255, description="Chapter title")
    content: str = Field(default="", description="Chapter content in Markdown/MDX format")


class UpdateChapterRequest(BaseModel):
    """Request to update an existing chapter."""

    title: str | None = Field(None, min_length=1, max_length=255)
    content: str | None = Field(None, description="Chapter content in Markdown/MDX format")
    week_number: int | None = Field(None, ge=1)
    module_number: int | None = Field(None, ge=1)
    chapter_number: int | None = Field(None, ge=1)


class ChapterFullResponse(BaseModel):
    """Full chapter response including content."""

    id: UUID
    week_number: int
    module_number: int
    chapter_number: int
    slug: str
    title: str
    word_count: int | None
    estimated_read_time: int | None
    status: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReorderChapterRequest(BaseModel):
    """Request to reorder chapters."""

    chapter_id: UUID
    new_week_number: int = Field(..., ge=1)
    new_module_number: int = Field(..., ge=1)
    new_chapter_number: int = Field(..., ge=1)


class BulkReorderRequest(BaseModel):
    """Request to bulk reorder multiple chapters."""

    chapters: list[ReorderChapterRequest]


# Background task for re-indexing content in Qdrant
async def index_chapter_content(
    chapter_id: UUID,
    chapter_slug: str,
    week_number: int,
    module_number: int,
    content: str,
) -> None:
    """Index chapter content in Qdrant (background task)."""
    from src.core.database import async_session_factory

    async with async_session_factory() as session:
        # Delete existing chunks for this chapter
        await session.execute(
            select(ContentChunk).where(ContentChunk.chapter_id == chapter_id)
        )
        existing_chunks = (
            await session.execute(
                select(ContentChunk).where(ContentChunk.chapter_id == chapter_id)
            )
        ).scalars().all()

        # Delete from Qdrant
        client = get_qdrant_client()
        for chunk in existing_chunks:
            if chunk.qdrant_point_id:
                try:
                    client.delete(
                        collection_name=settings.qdrant_collection,
                        points_selector=[str(chunk.qdrant_point_id)],
                    )
                except Exception:
                    pass  # Ignore if point doesn't exist

        # Delete from database
        for chunk in existing_chunks:
            await session.delete(chunk)

        # Create new chunks
        text_chunks = chunk_text(content, chunk_size=500, overlap=50)
        if not text_chunks:
            await session.commit()
            return

        # Generate embeddings
        embeddings = generate_embeddings(text_chunks)

        # Store chunks and index in Qdrant
        from qdrant_client.models import PointStruct

        points = []
        for i, (text, embedding) in enumerate(zip(text_chunks, embeddings)):
            point_id = uuid_lib.uuid4()

            # Create database chunk
            db_chunk = ContentChunk(
                id=uuid_lib.uuid4(),
                chapter_id=chapter_id,
                chunk_index=i,
                content_text=text[:500],  # Preview
                token_count=len(text) // 4,
                qdrant_point_id=point_id,
                embedded_at=datetime.now(),
            )
            session.add(db_chunk)

            # Create Qdrant point
            points.append(
                PointStruct(
                    id=str(point_id),
                    vector=embedding,
                    payload={
                        "chapter_id": str(chapter_id),
                        "chapter_slug": chapter_slug,
                        "week_number": week_number,
                        "module_number": module_number,
                        "chunk_index": i,
                        "content_preview": text[:200],
                        "content_type": "text",
                    },
                )
            )

        # Upsert to Qdrant
        if points:
            client.upsert(
                collection_name=settings.qdrant_collection,
                points=points,
            )

        await session.commit()


@router.post("/chapters", response_model=ChapterFullResponse, status_code=status.HTTP_201_CREATED)
async def create_chapter(
    request: CreateChapterRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    author: AuthorUser,
) -> ChapterFullResponse:
    """
    Create a new chapter (T105 - Author only).

    Creates a draft chapter that can be edited before publishing.
    """
    # Check slug uniqueness
    existing = await session.execute(select(Chapter).where(Chapter.slug == request.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Chapter with slug '{request.slug}' already exists",
        )

    # Check position uniqueness
    position_check = await session.execute(
        select(Chapter).where(
            Chapter.week_number == request.week_number,
            Chapter.module_number == request.module_number,
            Chapter.chapter_number == request.chapter_number,
        )
    )
    if position_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Chapter position {request.week_number}/{request.module_number}/{request.chapter_number} already exists",
        )

    # Calculate word count and read time
    word_count = len(request.content.split()) if request.content else 0
    estimated_read_time = max(1, word_count // 200)  # ~200 words per minute

    chapter = Chapter(
        week_number=request.week_number,
        module_number=request.module_number,
        chapter_number=request.chapter_number,
        slug=request.slug,
        title=request.title,
        word_count=word_count,
        estimated_read_time=estimated_read_time,
        status=ContentStatus.DRAFT,
    )
    session.add(chapter)
    await session.flush()
    await session.refresh(chapter)

    return ChapterFullResponse(
        id=chapter.id,
        week_number=chapter.week_number,
        module_number=chapter.module_number,
        chapter_number=chapter.chapter_number,
        slug=chapter.slug,
        title=chapter.title,
        word_count=chapter.word_count,
        estimated_read_time=chapter.estimated_read_time,
        status=chapter.status.value,
        published_at=chapter.published_at,
        created_at=chapter.created_at,
        updated_at=chapter.updated_at,
    )


@router.put("/chapters/{chapter_id}", response_model=ChapterFullResponse)
async def update_chapter(
    chapter_id: UUID,
    request: UpdateChapterRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    author: AuthorUser,
) -> ChapterFullResponse:
    """
    Update an existing chapter (T105 - Author only).
    """
    result = await session.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalar_one_or_none()

    if chapter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    # Update fields if provided
    if request.title is not None:
        chapter.title = request.title

    if request.week_number is not None:
        chapter.week_number = request.week_number

    if request.module_number is not None:
        chapter.module_number = request.module_number

    if request.chapter_number is not None:
        chapter.chapter_number = request.chapter_number

    if request.content is not None:
        word_count = len(request.content.split())
        chapter.word_count = word_count
        chapter.estimated_read_time = max(1, word_count // 200)

    await session.flush()
    await session.refresh(chapter)

    return ChapterFullResponse(
        id=chapter.id,
        week_number=chapter.week_number,
        module_number=chapter.module_number,
        chapter_number=chapter.chapter_number,
        slug=chapter.slug,
        title=chapter.title,
        word_count=chapter.word_count,
        estimated_read_time=chapter.estimated_read_time,
        status=chapter.status.value,
        published_at=chapter.published_at,
        created_at=chapter.created_at,
        updated_at=chapter.updated_at,
    )


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(
    chapter_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    author: AuthorUser,
) -> None:
    """
    Delete a chapter (T105 - Author only).

    Warning: This also deletes all associated reading progress and chunks.
    """
    result = await session.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalar_one_or_none()

    if chapter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    # Delete from Qdrant
    chunks = (
        await session.execute(
            select(ContentChunk).where(ContentChunk.chapter_id == chapter_id)
        )
    ).scalars().all()

    client = get_qdrant_client()
    for chunk in chunks:
        if chunk.qdrant_point_id:
            try:
                client.delete(
                    collection_name=settings.qdrant_collection,
                    points_selector=[str(chunk.qdrant_point_id)],
                )
            except Exception:
                pass

    await session.delete(chapter)
    await session.flush()


@router.post("/chapters/{chapter_id}/publish", response_model=ChapterFullResponse)
async def publish_chapter(
    chapter_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    background_tasks: BackgroundTasks,
    author: AuthorUser,
    content: str = "",
) -> ChapterFullResponse:
    """
    Publish a chapter (T106 - Author only).

    This makes the chapter visible to readers and triggers re-indexing (T111).
    """
    result = await session.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalar_one_or_none()

    if chapter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    chapter.status = ContentStatus.PUBLISHED
    chapter.published_at = datetime.now()

    await session.flush()
    await session.refresh(chapter)

    # Trigger re-indexing in background (T111)
    if content:
        background_tasks.add_task(
            index_chapter_content,
            chapter.id,
            chapter.slug,
            chapter.week_number,
            chapter.module_number,
            content,
        )

    return ChapterFullResponse(
        id=chapter.id,
        week_number=chapter.week_number,
        module_number=chapter.module_number,
        chapter_number=chapter.chapter_number,
        slug=chapter.slug,
        title=chapter.title,
        word_count=chapter.word_count,
        estimated_read_time=chapter.estimated_read_time,
        status=chapter.status.value,
        published_at=chapter.published_at,
        created_at=chapter.created_at,
        updated_at=chapter.updated_at,
    )


@router.post("/chapters/{chapter_id}/unpublish", response_model=ChapterFullResponse)
async def unpublish_chapter(
    chapter_id: UUID,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    author: AuthorUser,
) -> ChapterFullResponse:
    """
    Unpublish a chapter (T106 - Author only).

    This hides the chapter from readers but preserves the content.
    """
    result = await session.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalar_one_or_none()

    if chapter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    chapter.status = ContentStatus.DRAFT

    await session.flush()
    await session.refresh(chapter)

    return ChapterFullResponse(
        id=chapter.id,
        week_number=chapter.week_number,
        module_number=chapter.module_number,
        chapter_number=chapter.chapter_number,
        slug=chapter.slug,
        title=chapter.title,
        word_count=chapter.word_count,
        estimated_read_time=chapter.estimated_read_time,
        status=chapter.status.value,
        published_at=chapter.published_at,
        created_at=chapter.created_at,
        updated_at=chapter.updated_at,
    )


@router.put("/chapters/reorder", response_model=list[ChapterFullResponse])
async def reorder_chapters(
    request: BulkReorderRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    author: AuthorUser,
) -> list[ChapterFullResponse]:
    """
    Reorder multiple chapters (T107 - Author only).

    Allows bulk repositioning of chapters within the course structure.
    """
    results = []

    for reorder in request.chapters:
        chapter_result = await session.execute(
            select(Chapter).where(Chapter.id == reorder.chapter_id)
        )
        chapter = chapter_result.scalar_one_or_none()

        if chapter is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chapter {reorder.chapter_id} not found",
            )

        chapter.week_number = reorder.new_week_number
        chapter.module_number = reorder.new_module_number
        chapter.chapter_number = reorder.new_chapter_number

        await session.flush()
        await session.refresh(chapter)

        results.append(
            ChapterFullResponse(
                id=chapter.id,
                week_number=chapter.week_number,
                module_number=chapter.module_number,
                chapter_number=chapter.chapter_number,
                slug=chapter.slug,
                title=chapter.title,
                word_count=chapter.word_count,
                estimated_read_time=chapter.estimated_read_time,
                status=chapter.status.value,
                published_at=chapter.published_at,
                created_at=chapter.created_at,
                updated_at=chapter.updated_at,
            )
        )

    return results


@router.post("/chapters/{chapter_id}/reindex", status_code=status.HTTP_202_ACCEPTED)
async def trigger_reindex(
    chapter_id: UUID,
    content: str,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    background_tasks: BackgroundTasks,
    author: AuthorUser,
) -> dict:
    """
    Manually trigger re-indexing for a chapter (T111 - Author only).

    Use this after significant content changes to update the vector search index.
    """
    result = await session.execute(select(Chapter).where(Chapter.id == chapter_id))
    chapter = result.scalar_one_or_none()

    if chapter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )

    background_tasks.add_task(
        index_chapter_content,
        chapter.id,
        chapter.slug,
        chapter.week_number,
        chapter.module_number,
        content,
    )

    return {"message": "Re-indexing started", "chapter_id": str(chapter_id)}
