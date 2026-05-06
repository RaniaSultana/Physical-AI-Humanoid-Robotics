"""Script to index textbook content into Qdrant vector database."""

import re
import sys
import uuid
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from qdrant_client.models import PointStruct

from src.core.config import settings
from src.services.embedding_service import generate_embeddings, estimate_tokens
from src.services.qdrant_client import get_qdrant_client


def parse_mdx_file(file_path: Path) -> dict:
    """Parse an MDX file and extract content with metadata."""
    content = file_path.read_text(encoding="utf-8")

    # Extract frontmatter
    frontmatter = {}
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            for line in parts[1].strip().split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    frontmatter[key.strip()] = value.strip()
            content = parts[2]

    # Extract slug from file path
    # Assuming path like: docusaurus/docs/week-01/module-01/introduction.mdx
    slug_parts = file_path.parts
    try:
        docs_idx = slug_parts.index("docs")
        slug = "/".join(slug_parts[docs_idx + 1 :]).replace(".mdx", "").replace(".md", "")
    except ValueError:
        slug = file_path.stem

    # Parse week/module numbers from path
    week_match = re.search(r"week-(\d+)", slug)
    module_match = re.search(r"module-(\d+)", slug)

    week_number = int(week_match.group(1)) if week_match else 1
    module_number = int(module_match.group(1)) if module_match else 1

    return {
        "slug": slug,
        "title": frontmatter.get("title", file_path.stem),
        "content": content,
        "week_number": week_number,
        "module_number": module_number,
        "frontmatter": frontmatter,
    }


def chunk_content(content: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """Split content into chunks with section tracking."""
    chunks = []

    # Split by headers to preserve sections
    sections = re.split(r"(^#{1,3}\s+.+$)", content, flags=re.MULTILINE)

    current_section = "Introduction"
    current_text = ""

    for part in sections:
        if re.match(r"^#{1,3}\s+", part):
            # This is a header
            if current_text.strip():
                # Save accumulated text
                chunks.extend(
                    split_text_into_chunks(current_text, current_section, chunk_size, overlap)
                )
            current_section = part.strip("#").strip()
            current_text = ""
        else:
            current_text += part

    # Don't forget the last section
    if current_text.strip():
        chunks.extend(split_text_into_chunks(current_text, current_section, chunk_size, overlap))

    return chunks


def split_text_into_chunks(
    text: str, section: str, chunk_size: int, overlap: int
) -> list[dict]:
    """Split a section of text into overlapping chunks."""
    # Clean the text
    text = re.sub(r"\s+", " ", text).strip()

    # Remove code blocks for now (they'll be indexed separately in future)
    text = re.sub(r"```[\s\S]*?```", "[CODE BLOCK]", text)

    words = text.split()
    chunks = []

    i = 0
    chunk_index = 0

    while i < len(words):
        chunk_words = words[i : i + chunk_size]
        chunk_text = " ".join(chunk_words)

        if len(chunk_text) > 50:  # Skip very short chunks
            chunks.append(
                {
                    "section_title": section,
                    "content_text": chunk_text,
                    "token_count": estimate_tokens(chunk_text),
                    "chunk_index": chunk_index,
                }
            )
            chunk_index += 1

        i += chunk_size - overlap

    return chunks


def index_directory(docs_path: Path, batch_size: int = 20) -> None:
    """Index all MDX files in the docs directory."""
    print(f"Indexing content from: {docs_path}")

    client = get_qdrant_client()

    # Ensure collection exists (synchronous check for local client)
    from qdrant_client.models import Distance, VectorParams
    from src.core.config import settings

    collections = client.get_collections().collections
    collection_names = [c.name for c in collections]

    if settings.qdrant_collection not in collection_names:
        print(f"Creating collection: {settings.qdrant_collection}")
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
        )

    # Find all MDX files
    mdx_files = list(docs_path.rglob("*.mdx")) + list(docs_path.rglob("*.md"))
    print(f"Found {len(mdx_files)} content files")

    all_points = []

    for file_path in mdx_files:
        print(f"Processing: {file_path.name}")

        # Parse file
        parsed = parse_mdx_file(file_path)

        # Chunk content
        chunks = chunk_content(parsed["content"])
        print(f"  Created {len(chunks)} chunks")

        for chunk in chunks:
            point_id = str(uuid.uuid4())
            chunk["chapter_slug"] = parsed["slug"]
            chunk["week_number"] = parsed["week_number"]
            chunk["module_number"] = parsed["module_number"]
            chunk["content_type"] = "paragraph"
            chunk["content_preview"] = chunk["content_text"][:200]
            chunk["point_id"] = point_id

            all_points.append(chunk)

    print(f"\nTotal chunks to embed: {len(all_points)}")

    # Generate embeddings in batches
    print("Generating embeddings...")
    texts = [p["content_text"] for p in all_points]

    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        print(f"  Embedding batch {i // batch_size + 1}/{(len(texts) - 1) // batch_size + 1}")
        embeddings = generate_embeddings(batch)
        all_embeddings.extend(embeddings)

    # Create Qdrant points
    print("Uploading to Qdrant...")
    points = []
    for point_data, embedding in zip(all_points, all_embeddings):
        points.append(
            PointStruct(
                id=point_data["point_id"],
                vector=embedding,
                payload={
                    "chapter_slug": point_data["chapter_slug"],
                    "week_number": point_data["week_number"],
                    "module_number": point_data["module_number"],
                    "section_title": point_data["section_title"],
                    "content_type": point_data["content_type"],
                    "chunk_index": point_data["chunk_index"],
                    "content_preview": point_data["content_preview"],
                },
            )
        )

    # Upload in batches
    for i in range(0, len(points), 100):
        batch = points[i : i + 100]
        client.upsert(collection_name=settings.qdrant_collection, points=batch)
        print(f"  Uploaded {min(i + 100, len(points))}/{len(points)} points")

    print(f"\nIndexing complete! Total points: {len(points)}")


def main():
    """Main entry point."""
    # Default to docusaurus/docs in the project root
    project_root = Path(__file__).parent.parent.parent
    docs_path = project_root / "docusaurus" / "docs"

    if not docs_path.exists():
        print(f"Error: Docs path not found: {docs_path}")
        sys.exit(1)

    index_directory(docs_path)


if __name__ == "__main__":
    main()
