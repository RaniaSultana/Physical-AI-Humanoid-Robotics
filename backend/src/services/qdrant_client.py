"""Qdrant vector database client setup."""
from __future__ import annotations

from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from src.core.config import settings


@lru_cache
def get_qdrant_client() -> QdrantClient:
    """Get cached Qdrant client instance."""
    # Use local persistent storage for development
    if settings.environment == "development" and not settings.qdrant_api_key:
        # Use local file-based storage
        return QdrantClient(path="./qdrant_data")

    if settings.qdrant_api_key:
        return QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )
    return QdrantClient(url=settings.qdrant_url)


# Collection configuration
COLLECTION_CONFIG = VectorParams(
    size=1536,  # OpenAI text-embedding-3-small dimension
    distance=Distance.COSINE,
)

# Payload schema fields
PAYLOAD_FIELDS = [
    "chapter_id",
    "chapter_slug",
    "week_number",
    "module_number",
    "section_title",
    "content_type",
    "chunk_index",
    "content_preview",
]


async def ensure_collection_exists() -> None:
    """Ensure the textbook content collection exists."""
    client = get_qdrant_client()

    collections = client.get_collections().collections
    collection_names = [c.name for c in collections]

    if settings.qdrant_collection not in collection_names:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=COLLECTION_CONFIG,
        )


def search_similar(
    query_vector: list[float],
    limit: int = 5,
    chapter_filter: str | None = None,
) -> list[dict]:
    """Search for similar content chunks in Qdrant."""
    client = get_qdrant_client()

    filter_conditions = None
    if chapter_filter:
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        filter_conditions = Filter(
            must=[
                FieldCondition(
                    key="chapter_slug",
                    match=MatchValue(value=chapter_filter),
                )
            ]
        )

    try:
        # Try newer API first (query_points)
        results = client.query_points(
            collection_name=settings.qdrant_collection,
            query=query_vector,
            limit=limit,
            query_filter=filter_conditions,
            with_payload=True,
        ).points
    except (AttributeError, TypeError):
        # Fall back to older API (search)
        results = client.search(
            collection_name=settings.qdrant_collection,
            query_vector=query_vector,
            limit=limit,
            query_filter=filter_conditions,
            with_payload=True,
        )

    return [
        {
            "id": str(hit.id),
            "score": hit.score,
            "payload": hit.payload,
        }
        for hit in results
    ]
