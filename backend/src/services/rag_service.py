"""RAG (Retrieval-Augmented Generation) service for Q&A."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from qdrant_client.models import FieldCondition, Filter, MatchValue

from src.core.config import settings
from src.services.embedding_service import generate_embedding
from src.services.qdrant_client import get_qdrant_client


@dataclass
class RetrievedChunk:
    """A chunk of content retrieved from the vector database."""

    id: str
    chapter_slug: str
    section_title: str
    content_preview: str
    score: float
    chunk_index: int
    week_number: int
    module_number: int


@dataclass
class RetrievalResult:
    """Result of a RAG retrieval operation."""

    query: str
    chunks: list[RetrievedChunk]
    context_text: str
    total_chunks: int


def build_filter(
    chapter_slug: str | None = None,
    week_number: int | None = None,
) -> Filter | None:
    """Build Qdrant filter based on context constraints."""
    conditions = []

    if chapter_slug:
        conditions.append(
            FieldCondition(
                key="chapter_slug",
                match=MatchValue(value=chapter_slug),
            )
        )

    if week_number:
        conditions.append(
            FieldCondition(
                key="week_number",
                match=MatchValue(value=week_number),
            )
        )

    if not conditions:
        return None

    return Filter(must=conditions)


def retrieve_context(
    query: str,
    context_mode: Literal["chapter", "course", "selection"] = "course",
    chapter_slug: str | None = None,
    limit: int = 5,
    score_threshold: float = 0.7,
) -> RetrievalResult:
    """
    Retrieve relevant context chunks for a query.

    Args:
        query: The user's question or search query
        context_mode: Scope of the search (chapter, course, or selection)
        chapter_slug: If context_mode is "chapter", limit to this chapter
        limit: Maximum number of chunks to retrieve
        score_threshold: Minimum relevance score to include

    Returns:
        RetrievalResult with relevant chunks and formatted context
    """
    # Generate embedding for the query
    query_embedding = generate_embedding(query)

    # Build filter based on context mode
    query_filter = None
    if context_mode == "chapter" and chapter_slug:
        query_filter = build_filter(chapter_slug=chapter_slug)

    # Search in Qdrant
    client = get_qdrant_client()
    try:
        # Try newer API first (query)
        results = client.query_points(
            collection_name=settings.qdrant_collection,
            query=query_embedding,
            limit=limit,
            query_filter=query_filter,
            with_payload=True,
            score_threshold=score_threshold,
        ).points
    except (AttributeError, TypeError):
        # Fall back to older API (search)
        results = client.search(
            collection_name=settings.qdrant_collection,
            query_vector=query_embedding,
            limit=limit,
            query_filter=query_filter,
            with_payload=True,
            score_threshold=score_threshold,
        )

    # Convert to structured chunks
    chunks = []
    for hit in results:
        payload = hit.payload or {}
        chunks.append(
            RetrievedChunk(
                id=str(hit.id),
                chapter_slug=payload.get("chapter_slug", ""),
                section_title=payload.get("section_title", ""),
                content_preview=payload.get("content_preview", ""),
                score=hit.score,
                chunk_index=payload.get("chunk_index", 0),
                week_number=payload.get("week_number", 1),
                module_number=payload.get("module_number", 1),
            )
        )

    # Build context text for the LLM
    context_text = format_context_for_llm(chunks)

    return RetrievalResult(
        query=query,
        chunks=chunks,
        context_text=context_text,
        total_chunks=len(chunks),
    )


def format_context_for_llm(chunks: list[RetrievedChunk]) -> str:
    """
    Format retrieved chunks into context text for the LLM.

    Each chunk is formatted with source information for citation.
    """
    if not chunks:
        return "No relevant content found in the textbook."

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        source = f"[Source {i}: {chunk.chapter_slug}, {chunk.section_title}]"
        context_parts.append(f"{source}\n{chunk.content_preview}\n")

    return "\n---\n".join(context_parts)


def retrieve_for_highlight(
    selected_text: str,
    question: str,
    chapter_slug: str,
    limit: int = 3,
) -> RetrievalResult:
    """
    Special retrieval for Highlight & Ask feature.

    Combines the selected text and question for better context retrieval.
    """
    # Combine selected text and question for richer query
    combined_query = f"Context: {selected_text}\n\nQuestion: {question}"

    return retrieve_context(
        query=combined_query,
        context_mode="chapter",
        chapter_slug=chapter_slug,
        limit=limit,
        score_threshold=0.6,  # Lower threshold for more context
    )


def get_related_sections(
    chapter_slug: str,
    section_title: str,
    limit: int = 3,
) -> list[RetrievedChunk]:
    """
    Find sections related to the current one.

    Useful for "Related Topics" or "See Also" features.
    """
    # Use the section title as the query
    query = f"{section_title} concepts and topics"

    result = retrieve_context(
        query=query,
        context_mode="course",  # Search entire course
        limit=limit + 1,  # Get extra to filter out current section
        score_threshold=0.65,
    )

    # Filter out the current section
    return [
        chunk
        for chunk in result.chunks
        if not (chunk.chapter_slug == chapter_slug and chunk.section_title == section_title)
    ][:limit]


def extract_citations(chunks: list[RetrievedChunk]) -> list[dict]:
    """
    Extract citation information from retrieved chunks.

    Returns a list of citation dictionaries ready for database storage.
    """
    return [
        {
            "chapter_slug": chunk.chapter_slug,
            "section_title": chunk.section_title,
            "content_preview": chunk.content_preview[:200],  # Truncate for storage
            "relevance_score": chunk.score,
            "chunk_index": chunk.chunk_index,
        }
        for chunk in chunks
    ]
