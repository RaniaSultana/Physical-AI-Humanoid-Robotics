"""Translation service with caching for Urdu and other languages."""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import AsyncIterator

from openai import AsyncOpenAI

from src.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TranslationResult:
    """Result of a translation operation."""

    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    model_used: str
    cached: bool
    generation_time_seconds: float | None = None


@dataclass
class CacheEntry:
    """Cache entry for translations."""

    translated_text: str
    created_at: datetime
    access_count: int = 0


class TranslationCache:
    """In-memory cache for translations with TTL and LRU eviction."""

    def __init__(self, max_size: int = 1000, ttl_hours: int = 24):
        self._cache: dict[str, CacheEntry] = {}
        self._max_size = max_size
        self._ttl = timedelta(hours=ttl_hours)

    def _generate_key(self, text: str, source_lang: str, target_lang: str) -> str:
        """Generate a cache key from text and languages."""
        content = f"{source_lang}:{target_lang}:{text}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]

    def get(self, text: str, source_lang: str, target_lang: str) -> str | None:
        """Get a cached translation if available."""
        key = self._generate_key(text, source_lang, target_lang)
        entry = self._cache.get(key)

        if entry is None:
            return None

        # Check TTL
        if datetime.utcnow() - entry.created_at > self._ttl:
            del self._cache[key]
            return None

        # Update access count for LRU
        entry.access_count += 1
        return entry.translated_text

    def set(self, text: str, source_lang: str, target_lang: str, translation: str) -> None:
        """Cache a translation."""
        # Evict if at capacity
        if len(self._cache) >= self._max_size:
            self._evict_lru()

        key = self._generate_key(text, source_lang, target_lang)
        self._cache[key] = CacheEntry(
            translated_text=translation,
            created_at=datetime.utcnow(),
        )

    def _evict_lru(self) -> None:
        """Evict the least recently used entry."""
        if not self._cache:
            return

        # Find entry with lowest access count
        min_key = min(self._cache.keys(), key=lambda k: self._cache[k].access_count)
        del self._cache[min_key]

    def clear(self) -> None:
        """Clear all cached translations."""
        self._cache.clear()

    def stats(self) -> dict:
        """Get cache statistics."""
        return {
            "size": len(self._cache),
            "max_size": self._max_size,
            "ttl_hours": self._ttl.total_seconds() / 3600,
        }


# Singleton cache instance
_translation_cache = TranslationCache()


# Translation prompts by target language
TRANSLATION_PROMPTS = {
    "ur": """You are an expert translator specializing in technical and educational content translation from English to Urdu.

GUIDELINES:
1. Translate the following text into fluent, natural Urdu
2. Preserve technical terms in English with Urdu transliteration in parentheses
   Example: "robotics (روبوٹکس)"
3. Maintain the original meaning and tone
4. Preserve any code blocks, equations, or special formatting exactly as-is
5. Keep markdown formatting intact
6. For lists and headings, translate the content but keep markdown syntax

IMPORTANT:
- Do not add explanations or commentary
- Do not change the structure of the content
- Technical accuracy is crucial

Text to translate:
""",
}


class TranslationService:
    """Service for translating content between languages."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_chat_model
        self.cache = _translation_cache

    async def translate(
        self,
        text: str,
        target_language: str = "ur",
        source_language: str = "en",
        use_cache: bool = True,
    ) -> TranslationResult:
        """
        Translate text to the target language.

        Args:
            text: Text to translate
            target_language: Target language code (default: "ur" for Urdu)
            source_language: Source language code (default: "en" for English)
            use_cache: Whether to use caching

        Returns:
            TranslationResult with translated text
        """
        import time
        start_time = time.perf_counter()

        # Check cache
        if use_cache:
            cached = self.cache.get(text, source_language, target_language)
            if cached:
                logger.info(f"Translation cache hit for {target_language}")
                return TranslationResult(
                    original_text=text,
                    translated_text=cached,
                    source_language=source_language,
                    target_language=target_language,
                    model_used=self.model,
                    cached=True,
                )

        # Get translation prompt
        system_prompt = TRANSLATION_PROMPTS.get(target_language)
        if not system_prompt:
            system_prompt = f"""Translate the following text from {source_language} to {target_language}.
Preserve formatting, code blocks, and technical terms."""

        # Call OpenAI
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0.3,  # Lower temperature for more consistent translations
            max_tokens=4000,
        )

        translated_text = response.choices[0].message.content or ""
        generation_time = time.perf_counter() - start_time

        # Cache the result
        if use_cache:
            self.cache.set(text, source_language, target_language, translated_text)

        logger.info(f"Translation completed in {generation_time:.2f}s")

        return TranslationResult(
            original_text=text,
            translated_text=translated_text,
            source_language=source_language,
            target_language=target_language,
            model_used=self.model,
            cached=False,
            generation_time_seconds=generation_time,
        )

    async def translate_stream(
        self,
        text: str,
        target_language: str = "ur",
        source_language: str = "en",
    ) -> AsyncIterator[str]:
        """
        Stream translation for large content.

        Yields chunks of translated text as they're generated.
        """
        # Get translation prompt
        system_prompt = TRANSLATION_PROMPTS.get(target_language)
        if not system_prompt:
            system_prompt = f"""Translate the following text from {source_language} to {target_language}.
Preserve formatting, code blocks, and technical terms."""

        # Stream from OpenAI
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            max_tokens=4000,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def translate_chapter(
        self,
        chapter_content: str,
        target_language: str = "ur",
        chunk_size: int = 2000,
    ) -> TranslationResult:
        """
        Translate a full chapter, handling long content by chunking.

        Args:
            chapter_content: Full chapter markdown content
            target_language: Target language code
            chunk_size: Maximum characters per chunk

        Returns:
            TranslationResult with full translated content
        """
        import time
        start_time = time.perf_counter()

        # Check if content is short enough for single translation
        if len(chapter_content) <= chunk_size:
            return await self.translate(
                text=chapter_content,
                target_language=target_language,
            )

        # Split by sections (## headers)
        sections = self._split_by_sections(chapter_content)

        # Translate each section
        translated_sections = []
        for section in sections:
            result = await self.translate(
                text=section,
                target_language=target_language,
            )
            translated_sections.append(result.translated_text)

        # Combine translated sections
        translated_text = "\n\n".join(translated_sections)
        generation_time = time.perf_counter() - start_time

        return TranslationResult(
            original_text=chapter_content,
            translated_text=translated_text,
            source_language="en",
            target_language=target_language,
            model_used=self.model,
            cached=False,
            generation_time_seconds=generation_time,
        )

    def _split_by_sections(self, content: str) -> list[str]:
        """Split content by markdown sections."""
        lines = content.split("\n")
        sections = []
        current_section = []

        for line in lines:
            # Check for section header
            if line.startswith("## ") and current_section:
                sections.append("\n".join(current_section))
                current_section = [line]
            else:
                current_section.append(line)

        # Add the last section
        if current_section:
            sections.append("\n".join(current_section))

        return sections

    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        return self.cache.stats()

    def clear_cache(self) -> None:
        """Clear the translation cache."""
        self.cache.clear()
        logger.info("Translation cache cleared")


# Singleton instance
_translation_service: TranslationService | None = None


def get_translation_service() -> TranslationService:
    """Get the singleton TranslationService instance."""
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService()
    return _translation_service
