"""Script to setup Qdrant collection for textbook content."""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from qdrant_client.models import (
    Distance,
    PayloadSchemaType,
    VectorParams,
)

from src.core.config import settings
from src.services.qdrant_client import get_qdrant_client


def create_collection() -> None:
    """Create the textbook_content collection with proper schema."""
    client = get_qdrant_client()

    # Check if collection exists
    collections = client.get_collections().collections
    collection_names = [c.name for c in collections]

    if settings.qdrant_collection in collection_names:
        print(f"Collection '{settings.qdrant_collection}' already exists.")
        response = input("Do you want to recreate it? (y/N): ")
        if response.lower() != "y":
            print("Keeping existing collection.")
            return
        client.delete_collection(settings.qdrant_collection)
        print(f"Deleted existing collection '{settings.qdrant_collection}'.")

    # Create collection
    client.create_collection(
        collection_name=settings.qdrant_collection,
        vectors_config=VectorParams(
            size=1536,  # OpenAI text-embedding-3-small
            distance=Distance.COSINE,
        ),
    )
    print(f"Created collection '{settings.qdrant_collection}'.")

    # Create payload indexes for efficient filtering
    payload_indexes = {
        "chapter_slug": PayloadSchemaType.KEYWORD,
        "week_number": PayloadSchemaType.INTEGER,
        "module_number": PayloadSchemaType.INTEGER,
        "content_type": PayloadSchemaType.KEYWORD,
    }

    for field_name, schema_type in payload_indexes.items():
        client.create_payload_index(
            collection_name=settings.qdrant_collection,
            field_name=field_name,
            field_schema=schema_type,
        )
        print(f"Created index for '{field_name}'.")

    print("\nQdrant collection setup complete!")
    print(f"Collection: {settings.qdrant_collection}")
    print(f"Vector size: 1536 (text-embedding-3-small)")
    print(f"Distance metric: Cosine")


if __name__ == "__main__":
    create_collection()
