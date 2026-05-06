"""Personalization API endpoints for translation and content adaptation."""
from __future__ import annotations

import hashlib
import json
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.translation_agent import get_translation_agent
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.content import Chapter
from src.models.personalized_content import (
    ContentLanguage,
    PersonalizedContent,
    PersonalizationType,
    TranslatedContent,
)
from src.models.user import User

router = APIRouter(prefix="/personalization", tags=["personalization"])


# Request/Response Models
class TranslateRequest(BaseModel):
    """Request to translate content."""

    chapter_id: str
    content: str
    title: str | None = None
    target_language: str = "ur"


class TranslationResponse(BaseModel):
    """Translation response."""

    chapter_id: UUID
    original_title: str | None
    translated_title: str | None
    translated_content: str
    target_language: str
    cached: bool = False


class PersonalizeRequest(BaseModel):
    """Request to personalize content."""

    chapter_id: UUID
    content: str
    title: str | None = None
    interests: list[str] | None = None


class PersonalizedResponse(BaseModel):
    """Personalized content response."""

    chapter_id: UUID
    original_title: str | None
    personalized_title: str | None
    personalized_content: str
    personalization_type: str


# Endpoints
@router.post("/translate", response_model=TranslationResponse)
async def translate_content(
    request: TranslateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TranslationResponse:
    """
    Translate chapter content to Urdu (FR-014).

    Caches translations for efficiency.
    """
    # Generate content hash for caching
    content_hash = hashlib.sha256(request.content.encode()).hexdigest()[:32]

    # Resolve chapter_id (could be slug or UUID string)
    chapter_uuid = None
    try:
        chapter_uuid = UUID(request.chapter_id)
    except ValueError:
        # Try finding by slug
        stmt = select(Chapter.id).where(Chapter.slug == request.chapter_id)
        result = await db.execute(stmt)
        chapter_uuid = result.scalar_one_or_none()

    if not chapter_uuid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chapter not found: {request.chapter_id}",
        )

    # Check cache
    cache_query = select(TranslatedContent).where(
        TranslatedContent.chapter_id == chapter_uuid,
        TranslatedContent.target_language == ContentLanguage.URDU,
        TranslatedContent.content_hash == content_hash,
    )
    cache_result = await db.execute(cache_query)
    cached = cache_result.scalar_one_or_none()

    if cached:
        return TranslationResponse(
            chapter_id=chapter_uuid,
            original_title=request.title,
            translated_title=cached.translated_title,
            translated_content=cached.translated_content,
            target_language="ur",
            cached=True,
        )

    # Generate translation
    agent = get_translation_agent()

    # Translate title if provided
    translated_title = None
    if request.title:
        translated_title = await agent.translate_title(request.title, target_lang=request.target_language)

    # Translate content
    result = await agent.translate(request.content, target_lang=request.target_language)

    # Cache the translation
    translation = TranslatedContent(
        chapter_id=chapter_uuid,
        source_language=ContentLanguage.ENGLISH,
        target_language=ContentLanguage.URDU,
        content_hash=content_hash,
        translated_title=translated_title or "",
        translated_content=result.translated_text,
        tokens_used=result.prompt_tokens + result.completion_tokens,
    )
    db.add(translation)
    await db.commit()

    return TranslationResponse(
        chapter_id=chapter_uuid,
        original_title=request.title,
        translated_title=translated_title,
        translated_content=result.translated_text,
        target_language=request.target_language,
        cached=False,
    )


@router.post("/translate/stream")
async def translate_content_stream(
    request: TranslateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Stream translation of chapter content to Urdu.

    Returns Server-Sent Events with translation chunks.
    """
    agent = get_translation_agent()

    async def generate():
        """Generate SSE events for streaming translation."""
        # First translate title if provided
        if request.title:
            translated_title = await agent.translate_title(request.title, target_lang=request.target_language)
            yield f"event: title\ndata: {json.dumps({'title': translated_title})}\n\n"

        # Stream content translation
        async for chunk in agent.translate_stream(request.content, target_lang=request.target_language):
            yield f"data: {json.dumps({'content': chunk})}\n\n"

        yield f"event: done\ndata: {json.dumps({'status': 'complete'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/translate/{chapter_id}")
async def get_cached_translation(
    chapter_id: UUID,
    target_language: Literal["ur"] = "ur",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TranslationResponse | dict:
    """
    Get cached translation for a chapter if available.
    """
    query = select(TranslatedContent).where(
        TranslatedContent.chapter_id == chapter_id,
        TranslatedContent.target_language == ContentLanguage.URDU,
    ).order_by(TranslatedContent.created_at.desc())

    result = await db.execute(query)
    translation = result.scalar_one_or_none()

    if not translation:
        return {"available": False, "message": "No cached translation available"}

    return TranslationResponse(
        chapter_id=chapter_id,
        original_title=None,
        translated_title=translation.translated_title,
        translated_content=translation.translated_content,
        target_language="ur",
        cached=True,
    )


@router.post("/personalize", response_model=PersonalizedResponse)
async def personalize_content(
    request: PersonalizeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PersonalizedResponse:
    """
    Generate personalized chapter content based on user background (FR-013).
    """
    from openai import AsyncOpenAI
    from src.core.config import settings

    # Build personalization context from user profile
    context_parts = []

    if current_user.background_type:
        context_parts.append(f"Background: {current_user.background_type.value}")

    if current_user.software_experience:
        context_parts.append(f"Software experience: {current_user.software_experience.value}")

    if current_user.hardware_experience:
        context_parts.append(f"Hardware experience: {current_user.hardware_experience.value}")

    if current_user.learning_goals:
        context_parts.append(f"Learning goals: {current_user.learning_goals}")

    if request.interests:
        context_parts.append(f"Specific interests: {', '.join(request.interests)}")

    if not context_parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No personalization context available. Please set your background first.",
        )

    user_context = "\n".join(context_parts)

    # Generate personalized content
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    system_prompt = """You are an expert educational content adapter. Your task is to personalize textbook content based on the student's background and interests.

Guidelines:
1. Keep all core information and technical accuracy
2. Adjust examples to be more relevant to the student's background
3. Emphasize aspects most relevant to their interests
4. Adjust complexity based on their experience level
5. Preserve all formatting (markdown, code blocks, etc.)
6. Keep the same overall structure
7. Add clarifications where the student might need them based on their background"""

    user_prompt = f"""Personalize the following educational content for a student with this profile:

{user_context}

---
Content to personalize:

{request.content}
---

Provide the personalized version maintaining all formatting."""

    response = await client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=4000,
    )

    personalized_text = response.choices[0].message.content or request.content
    usage = response.usage

    # Save to database
    personalized = PersonalizedContent(
        chapter_id=request.chapter_id,
        user_id=current_user.id,
        personalization_type=PersonalizationType.BACKGROUND_ADAPTATION,
        parameters={
            "background_type": current_user.background_type.value if current_user.background_type else None,
            "interests": request.interests,
        },
        personalized_title=request.title,
        personalized_content=personalized_text,
        tokens_used=(usage.prompt_tokens + usage.completion_tokens) if usage else None,
    )
    db.add(personalized)
    await db.commit()

    return PersonalizedResponse(
        chapter_id=request.chapter_id,
        original_title=request.title,
        personalized_title=request.title,  # Title usually stays the same
        personalized_content=personalized_text,
        personalization_type="background_adaptation",
    )


@router.get("/history")
async def get_personalization_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
) -> list[dict]:
    """Get user's personalization history."""
    query = (
        select(PersonalizedContent)
        .where(PersonalizedContent.user_id == current_user.id)
        .order_by(PersonalizedContent.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    return [
        {
            "id": str(item.id),
            "chapter_id": str(item.chapter_id),
            "type": item.personalization_type.value,
            "created_at": item.created_at.isoformat(),
        }
        for item in items
    ]
