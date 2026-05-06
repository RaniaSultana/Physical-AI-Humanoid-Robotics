"""Translation Agent for translating content to Urdu."""
from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncIterator

from openai import AsyncOpenAI

from src.core.config import settings


@dataclass
class TranslationResult:
    """Result of a translation operation."""

    translated_text: str
    prompt_tokens: int = 0
    completion_tokens: int = 0


TRANSLATION_SYSTEM_PROMPT = """You are an expert translator specializing in educational content translation from English to Urdu. Your translations should:

1. Be accurate and preserve the technical meaning
2. Use appropriate Urdu technical terms where they exist
3. Keep English technical terms (like "AI", "robot", "sensor") when no widely-accepted Urdu equivalent exists
4. Maintain the educational tone and clarity
5. Preserve all formatting (headers, lists, code blocks)
6. Keep code examples in English but translate comments
7. Preserve markdown formatting exactly

IMPORTANT:
- Do NOT translate code snippets (content between ``` markers)
- Keep URLs, file paths, and technical identifiers unchanged
- Preserve all markdown syntax (##, *, -, etc.)
- Output should be in Urdu script (not transliteration)

When translating:
- Use formal Urdu appropriate for academic content
- Technical terms can remain in English with Urdu explanation in parentheses if helpful
- Maintain the same paragraph structure"""


class TranslationAgent:
    """Agent for translating educational content to Urdu."""

    def __init__(self):
        if settings.ai_provider == "openrouter":
            self.client = AsyncOpenAI(
                api_key=settings.openrouter_api_key,
                base_url=settings.openrouter_base_url,
            )
            self.model = settings.openrouter_model
        else:
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)
            self.model = settings.openai_chat_model

    async def translate(
        self,
        content: str,
        source_lang: str = "en",
        target_lang: str = "ur",
    ) -> TranslationResult:
        """
        Translate content from source language to target language.

        Args:
            content: The content to translate
            source_lang: Source language code (default: en)
            target_lang: Target language code (default: ur)

        Returns:
            TranslationResult with translated text
        """
        language_names = {
            "ur": "Urdu",
            "hi": "Hindi",
            "ar": "Arabic",
            "es": "Spanish",
            "fr": "French",
            "zh": "Chinese",
        }
        target_lang_name = language_names.get(target_lang, "Urdu")

        user_prompt = f"""Translate the following educational content from {source_lang} to {target_lang_name}.
Preserve all markdown formatting, code blocks, and technical structure.

---
{content}
---

Provide only the translated content, nothing else."""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": TRANSLATION_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,  # Lower temperature for more consistent translations
            max_tokens=4000,
        )

        translated = response.choices[0].message.content or ""
        usage = response.usage

        return TranslationResult(
            translated_text=translated.strip(),
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
        )

    async def translate_stream(
        self,
        content: str,
        source_lang: str = "en",
        target_lang: str = "ur",
    ) -> AsyncIterator[str]:
        """
        Stream translation of content.

        Yields chunks of translated text as they are generated.
        """
        language_names = {
            "ur": "Urdu",
            "hi": "Hindi",
            "ar": "Arabic",
            "es": "Spanish",
            "fr": "French",
            "zh": "Chinese",
        }
        target_lang_name = language_names.get(target_lang, "Urdu")

        user_prompt = f"""Translate the following educational content from {source_lang} to {target_lang_name}.
Preserve all markdown formatting, code blocks, and technical structure.

---
{content}
---

Provide only the translated content, nothing else."""

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": TRANSLATION_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=4000,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def translate_title(self, title: str, target_lang: str = "ur") -> str:
        """Translate a chapter title."""
        language_names = {
            "ur": "Urdu",
            "hi": "Hindi",
            "ar": "Arabic",
            "es": "Spanish",
            "fr": "French",
            "zh": "Chinese",
        }
        target_lang_name = language_names.get(target_lang, "Urdu")

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": f"Translate the following chapter title to {target_lang_name}. Keep technical terms in English if appropriate. Return only the translation.",
                },
                {"role": "user", "content": title},
            ],
            temperature=0.3,
            max_tokens=200,
        )

        return response.choices[0].message.content or title


# Singleton instance
_translation_agent: TranslationAgent | None = None


def get_translation_agent() -> TranslationAgent:
    """Get the singleton Translation agent instance."""
    global _translation_agent
    if _translation_agent is None:
        _translation_agent = TranslationAgent()
    return _translation_agent
