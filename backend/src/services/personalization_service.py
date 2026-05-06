"""Personalization Service for managing content personalization workflows (T121).

This service encapsulates the business logic for personalizing chapter content
based on user background, interests, and learning goals.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import AsyncIterator
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.personalization_agent import (
    PersonalizationAgent,
    PersonalizationContext,
    PersonalizedContentResult,
    get_personalization_agent,
)
from src.models.personalized_content import (
    PersonalizedContent,
    PersonalizationType,
)
from src.models.user import BackgroundType, ExperienceLevel, User


@dataclass
class PersonalizationRequest:
    """Request for content personalization."""

    chapter_id: UUID
    content: str
    title: str | None = None
    interests: str | None = None
    custom_instructions: str | None = None


@dataclass
class PersonalizationResult:
    """Result of personalization operation."""

    chapter_id: UUID
    original_content: str
    personalized_content: str
    title: str | None
    personalized_title: str | None
    personalization_type: PersonalizationType
    cached: bool
    model_used: str | None
    generation_time_seconds: float | None
    tokens_used: int | None


class PersonalizationService:
    """Service for personalizing content based on user context."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._agent: PersonalizationAgent | None = None

    @property
    def agent(self) -> PersonalizationAgent:
        """Lazy-load the personalization agent."""
        if self._agent is None:
            self._agent = get_personalization_agent()
        return self._agent

    async def personalize_content(
        self,
        user: User,
        request: PersonalizationRequest,
        use_cache: bool = True,
    ) -> PersonalizationResult:
        """
        Personalize chapter content for a specific user.

        Args:
            user: The user requesting personalization
            request: Personalization request details
            use_cache: Whether to check for cached results

        Returns:
            PersonalizationResult with personalized content
        """
        # Build context from user profile
        context = self._build_context(user, request.interests)

        # Generate content hash for caching
        content_hash = self._generate_hash(
            request.content,
            context,
        )

        # Check cache if enabled
        if use_cache:
            cached = await self._get_cached(
                user.id,
                request.chapter_id,
                content_hash,
            )
            if cached:
                return PersonalizationResult(
                    chapter_id=request.chapter_id,
                    original_content=request.content,
                    personalized_content=cached.personalized_content,
                    title=request.title,
                    personalized_title=cached.personalized_title,
                    personalization_type=cached.personalization_type,
                    cached=True,
                    model_used=None,
                    generation_time_seconds=None,
                    tokens_used=cached.tokens_used,
                )

        # Generate personalized content
        result = await self.agent.personalize(
            chapter_content=request.content,
            context=context,
        )

        # Determine personalization type
        personalization_type = PersonalizationType.BACKGROUND_ADAPTATION
        if request.interests:
            personalization_type = PersonalizationType.INTEREST_BASED

        # Store result
        stored = await self._store_result(
            user_id=user.id,
            chapter_id=request.chapter_id,
            content_hash=content_hash,
            result=result,
            title=request.title,
            personalization_type=personalization_type,
            interests=request.interests,
        )

        return PersonalizationResult(
            chapter_id=request.chapter_id,
            original_content=result.original_content,
            personalized_content=result.personalized_content,
            title=request.title,
            personalized_title=request.title,  # Title usually stays the same
            personalization_type=personalization_type,
            cached=False,
            model_used=result.model_used,
            generation_time_seconds=result.generation_time_seconds,
            tokens_used=result.prompt_tokens + result.completion_tokens,
        )

    async def personalize_content_stream(
        self,
        user: User,
        request: PersonalizationRequest,
    ) -> AsyncIterator[str]:
        """
        Stream personalized content generation.

        Args:
            user: The user requesting personalization
            request: Personalization request details

        Yields:
            Chunks of personalized content
        """
        context = self._build_context(user, request.interests)

        async for chunk in self.agent.personalize_stream(
            chapter_content=request.content,
            context=context,
        ):
            yield chunk

    async def suggest_interests(
        self,
        user: User,
        chapter_title: str,
        chapter_summary: str,
    ) -> list[str]:
        """
        Suggest personalization interests based on chapter and user.

        Args:
            user: The user to generate suggestions for
            chapter_title: Title of the chapter
            chapter_summary: Brief summary of the chapter

        Returns:
            List of suggested interest areas
        """
        return await self.agent.suggest_interests(
            chapter_title=chapter_title,
            chapter_summary=chapter_summary,
            background_type=user.background_type,
        )

    async def get_personalization_history(
        self,
        user_id: UUID,
        chapter_id: UUID | None = None,
        limit: int = 10,
    ) -> list[PersonalizedContent]:
        """
        Get personalization history for a user.

        Args:
            user_id: User's ID
            chapter_id: Optional filter by chapter
            limit: Maximum results to return

        Returns:
            List of PersonalizedContent records
        """
        query = select(PersonalizedContent).where(
            PersonalizedContent.user_id == user_id
        )

        if chapter_id:
            query = query.where(PersonalizedContent.chapter_id == chapter_id)

        query = query.order_by(PersonalizedContent.created_at.desc()).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_latest_personalization(
        self,
        user_id: UUID,
        chapter_id: UUID,
    ) -> PersonalizedContent | None:
        """
        Get the most recent personalization for a user-chapter pair.

        Args:
            user_id: User's ID
            chapter_id: Chapter's ID

        Returns:
            Most recent PersonalizedContent or None
        """
        query = (
            select(PersonalizedContent)
            .where(
                PersonalizedContent.user_id == user_id,
                PersonalizedContent.chapter_id == chapter_id,
            )
            .order_by(PersonalizedContent.created_at.desc())
            .limit(1)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    def _build_context(
        self,
        user: User,
        interests: str | None,
    ) -> PersonalizationContext:
        """Build personalization context from user profile."""
        return PersonalizationContext(
            background_type=user.background_type,
            software_experience=user.software_experience,
            hardware_experience=user.hardware_experience,
            learning_goals=user.learning_goals,
            interests=interests or "",
        )

    def _generate_hash(
        self,
        content: str,
        context: PersonalizationContext,
    ) -> str:
        """Generate a hash for caching based on content and context."""
        components = [
            content,
            str(context.background_type.value if context.background_type else ""),
            str(context.software_experience.value if context.software_experience else ""),
            str(context.hardware_experience.value if context.hardware_experience else ""),
            context.interests or "",
        ]
        combined = "|".join(components)
        return hashlib.sha256(combined.encode()).hexdigest()[:32]

    async def _get_cached(
        self,
        user_id: UUID,
        chapter_id: UUID,
        content_hash: str,
    ) -> PersonalizedContent | None:
        """Get cached personalization if available."""
        query = select(PersonalizedContent).where(
            PersonalizedContent.user_id == user_id,
            PersonalizedContent.chapter_id == chapter_id,
            PersonalizedContent.content_hash == content_hash,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _store_result(
        self,
        user_id: UUID,
        chapter_id: UUID,
        content_hash: str,
        result: PersonalizedContentResult,
        title: str | None,
        personalization_type: PersonalizationType,
        interests: str | None,
    ) -> PersonalizedContent:
        """Store personalization result in database."""
        personalized = PersonalizedContent(
            chapter_id=chapter_id,
            user_id=user_id,
            personalization_type=personalization_type,
            content_hash=content_hash,
            parameters={
                "background_type": result.context.background_type.value if result.context.background_type else None,
                "software_experience": result.context.software_experience.value if result.context.software_experience else None,
                "hardware_experience": result.context.hardware_experience.value if result.context.hardware_experience else None,
                "interests": interests,
            },
            personalized_title=title,
            personalized_content=result.personalized_content,
            tokens_used=result.prompt_tokens + result.completion_tokens,
        )
        self.db.add(personalized)
        await self.db.commit()
        await self.db.refresh(personalized)
        return personalized


async def get_personalization_service(db: AsyncSession) -> PersonalizationService:
    """Factory function to get PersonalizationService instance."""
    return PersonalizationService(db)
