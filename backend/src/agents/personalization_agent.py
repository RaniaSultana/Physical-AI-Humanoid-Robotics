"""Personalization Agent for generating personalized chapter content."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import AsyncIterator

from openai import AsyncOpenAI

from src.core.config import settings
from src.models.user import BackgroundType, ExperienceLevel


@dataclass
class PersonalizationContext:
    """Context for personalizing content."""

    background_type: BackgroundType | None
    software_experience: ExperienceLevel | None
    hardware_experience: ExperienceLevel | None
    learning_goals: str | None
    interests: str  # User-specified interests for this personalization


@dataclass
class PersonalizedContentResult:
    """Result of content personalization."""

    original_content: str
    personalized_content: str
    context: PersonalizationContext
    model_used: str
    generation_time_seconds: float | None = None
    prompt_tokens: int = 0
    completion_tokens: int = 0


# Background-specific system prompts
BACKGROUND_PROMPTS = {
    BackgroundType.CS_STUDENT: """The reader is a Computer Science student. When explaining concepts:
- Draw parallels to programming concepts, algorithms, and data structures they know
- Use code examples where relevant
- Relate physical systems to software abstractions (e.g., state machines, feedback loops)
- Assume strong mathematical background but explain physics concepts more carefully""",

    BackgroundType.ME_STUDENT: """The reader is a Mechanical Engineering student. When explaining concepts:
- Emphasize mechanical systems, kinematics, and dynamics
- Relate to CAD, FEA, and mechanical design principles
- Explain software concepts with mechanical analogies
- Assume strong physics and mechanics background but introduce programming concepts gently""",

    BackgroundType.EE_STUDENT: """The reader is an Electrical Engineering student. When explaining concepts:
- Connect to circuits, signals, and control systems
- Relate to microcontrollers, sensors, and actuators
- Use electrical analogies (voltage/current) to explain mechanical concepts
- Assume familiarity with embedded systems and signal processing""",

    BackgroundType.HOBBYIST: """The reader is a hobbyist learning robotics for personal interest. When explaining concepts:
- Use practical, hands-on examples
- Relate to popular maker projects and platforms (Arduino, Raspberry Pi)
- Avoid excessive theory, focus on practical application
- Provide step-by-step explanations with real-world context""",

    BackgroundType.PROFESSIONAL: """The reader is a working professional. When explaining concepts:
- Focus on practical applications and industry relevance
- Connect to real-world business and engineering challenges
- Be concise and efficient with explanations
- Highlight trade-offs and decision-making factors""",

    BackgroundType.OTHER: """Adapt explanations to be accessible to a general technical audience:
- Explain concepts clearly without assuming specific background
- Use universal analogies and examples
- Build up from fundamentals when introducing complex topics
- Provide context for technical terms""",
}

# Experience level modifiers
EXPERIENCE_MODIFIERS = {
    ExperienceLevel.NONE: "Explain {domain} concepts from first principles with simple examples.",
    ExperienceLevel.BEGINNER: "Provide clear explanations with helpful examples for {domain} concepts.",
    ExperienceLevel.INTERMEDIATE: "Assume basic {domain} knowledge but explain advanced concepts clearly.",
    ExperienceLevel.ADVANCED: "Focus on advanced {domain} concepts and nuances.",
}


class PersonalizationAgent:
    """Agent for personalizing chapter content based on user background."""

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

    async def personalize(
        self,
        chapter_content: str,
        context: PersonalizationContext,
    ) -> PersonalizedContentResult:
        """
        Personalize chapter content based on user context.

        Args:
            chapter_content: Original chapter markdown content
            context: User's background and interests

        Returns:
            PersonalizedContentResult with adapted content
        """
        import time
        start_time = time.perf_counter()

        # Build system prompt
        system_prompt = self._build_system_prompt(context)

        # Call OpenAI
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"""Please personalize the following chapter content based on my interests: "{context.interests}"

Original Chapter Content:
{chapter_content}

Remember to:
1. Maintain all the core information and concepts
2. Adapt examples and explanations to my background and interests
3. Keep the markdown formatting intact
4. Add relevant examples from my interest area where appropriate
5. Adjust the technical depth based on my experience level"""},
            ],
            temperature=0.7,
            max_tokens=4000,
        )

        personalized_content = response.choices[0].message.content or ""
        usage = response.usage
        generation_time = time.perf_counter() - start_time

        return PersonalizedContentResult(
            original_content=chapter_content,
            personalized_content=personalized_content,
            context=context,
            model_used=self.model,
            generation_time_seconds=generation_time,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
        )

    async def personalize_stream(
        self,
        chapter_content: str,
        context: PersonalizationContext,
    ) -> AsyncIterator[str]:
        """
        Stream personalized content generation.

        Yields chunks of personalized content as they're generated.
        """
        # Build system prompt
        system_prompt = self._build_system_prompt(context)

        # Stream from OpenAI
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"""Please personalize the following chapter content based on my interests: "{context.interests}"

Original Chapter Content:
{chapter_content}

Remember to:
1. Maintain all the core information and concepts
2. Adapt examples and explanations to my background and interests
3. Keep the markdown formatting intact
4. Add relevant examples from my interest area where appropriate
5. Adjust the technical depth based on my experience level"""},
            ],
            temperature=0.7,
            max_tokens=4000,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def suggest_interests(
        self,
        chapter_title: str,
        chapter_summary: str,
        background_type: BackgroundType | None,
    ) -> list[str]:
        """
        Suggest personalization interests based on chapter content and user background.

        Args:
            chapter_title: Title of the chapter
            chapter_summary: Brief summary of the chapter
            background_type: User's background

        Returns:
            List of suggested interest areas for personalization
        """
        background_context = ""
        if background_type:
            background_context = f"The user is a {background_type.value.replace('_', ' ')}."

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": """Generate 5 specific, actionable interest areas that could be used to personalize educational content.
Each suggestion should be:
- Specific (not generic)
- Relevant to the chapter topic
- Appropriate for the user's background
- Expressed as a short phrase (3-6 words)

Return ONLY a JSON array of strings, nothing else."""
                },
                {
                    "role": "user",
                    "content": f"""Chapter: {chapter_title}
Summary: {chapter_summary}
{background_context}

Generate 5 personalization interest suggestions."""
                },
            ],
            temperature=0.8,
            max_tokens=200,
        )

        content = response.choices[0].message.content or "[]"
        try:
            import json
            suggestions = json.loads(content)
            if isinstance(suggestions, list):
                return suggestions[:5]
        except json.JSONDecodeError:
            pass

        # Fallback suggestions
        return [
            "Practical applications",
            "Industry examples",
            "Hands-on projects",
            "Mathematical foundations",
            "Real-world case studies",
        ]

    def _build_system_prompt(self, context: PersonalizationContext) -> str:
        """Build the system prompt based on user context."""
        parts = [
            """You are an AI educational content adapter. Your task is to personalize educational content about Physical AI and Robotics to match the user's background and interests.

IMPORTANT GUIDELINES:
1. NEVER remove or significantly alter the core concepts being taught
2. Adapt examples, analogies, and explanations to resonate with the user's background
3. Adjust technical depth based on experience level
4. Add relevant examples from the user's interest area
5. Maintain the original markdown formatting
6. Keep the content length similar to the original (±20%)
7. Preserve all code blocks, equations, and diagrams exactly as they appear
"""
        ]

        # Add background-specific guidance
        if context.background_type:
            background_prompt = BACKGROUND_PROMPTS.get(context.background_type)
            if background_prompt:
                parts.append(f"\n## User Background\n{background_prompt}")

        # Add experience level guidance
        if context.software_experience:
            modifier = EXPERIENCE_MODIFIERS.get(context.software_experience, "")
            if modifier:
                parts.append(f"\nSoftware: {modifier.format(domain='software/programming')}")

        if context.hardware_experience:
            modifier = EXPERIENCE_MODIFIERS.get(context.hardware_experience, "")
            if modifier:
                parts.append(f"\nHardware: {modifier.format(domain='hardware/electronics')}")

        # Add learning goals if provided
        if context.learning_goals:
            parts.append(f"\n## User's Learning Goals\n{context.learning_goals}")

        return "\n".join(parts)


# Singleton instance
_personalization_agent: PersonalizationAgent | None = None


def get_personalization_agent() -> PersonalizationAgent:
    """Get the singleton Personalization agent instance."""
    global _personalization_agent
    if _personalization_agent is None:
        _personalization_agent = PersonalizationAgent()
    return _personalization_agent
