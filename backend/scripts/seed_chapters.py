"""Script to seed chapters from MDX files into the database."""

import re
import sys
import uuid
import sqlite3
from pathlib import Path
from datetime import datetime


def parse_mdx_frontmatter(file_path: Path) -> dict:
    """Parse an MDX file and extract metadata."""
    content = file_path.read_text(encoding="utf-8")

    # Extract frontmatter
    frontmatter = {}
    body = content
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            for line in parts[1].strip().split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    frontmatter[key.strip()] = value.strip()
            body = parts[2]

    # Extract slug from file path
    slug_parts = file_path.parts
    try:
        docs_idx = slug_parts.index("docs")
        slug = "/".join(slug_parts[docs_idx + 1:]).replace(".mdx", "").replace(".md", "")
    except ValueError:
        slug = file_path.stem

    # Parse week/module/chapter numbers from path
    week_match = re.search(r"week-(\d+)", slug)
    module_match = re.search(r"module-(\d+)", slug)

    week_number = int(week_match.group(1)) if week_match else 1
    module_number = int(module_match.group(1)) if module_match else 1

    # Chapter number from sidebar_position or default
    chapter_number = int(frontmatter.get("sidebar_position", 1))

    # Word count
    words = len(body.split())
    estimated_read_time = max(1, words // 200)  # ~200 words per minute

    return {
        "slug": slug,
        "title": frontmatter.get("title", file_path.stem.replace("-", " ").title()),
        "week_number": week_number,
        "module_number": module_number,
        "chapter_number": chapter_number,
        "word_count": words,
        "estimated_read_time": estimated_read_time,
    }


def seed_chapters(docs_path: Path, db_path: Path) -> None:
    """Seed chapters from MDX files into the database."""
    print(f"Seeding chapters from: {docs_path}")
    print(f"Database: {db_path}")

    # Create database connection
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Find all MDX files
    mdx_files = list(docs_path.rglob("*.mdx")) + list(docs_path.rglob("*.md"))
    # Filter out node_modules
    mdx_files = [f for f in mdx_files if "node_modules" not in str(f)]

    print(f"Found {len(mdx_files)} content files")

    chapters_created = 0
    chapters_updated = 0

    for file_path in mdx_files:
        print(f"Processing: {file_path.name}")

        metadata = parse_mdx_frontmatter(file_path)

        # Check if chapter exists
        cursor.execute("SELECT id FROM chapters WHERE slug = ?", (metadata["slug"],))
        existing = cursor.fetchone()

        now = datetime.utcnow().isoformat()

        if existing:
            # Update existing chapter
            cursor.execute("""
                UPDATE chapters SET
                    title = ?, week_number = ?, module_number = ?, chapter_number = ?,
                    word_count = ?, estimated_read_time = ?, updated_at = ?
                WHERE slug = ?
            """, (
                metadata["title"], metadata["week_number"], metadata["module_number"],
                metadata["chapter_number"], metadata["word_count"], metadata["estimated_read_time"],
                now, metadata["slug"]
            ))
            chapters_updated += 1
            print(f"  Updated: {metadata['slug']}")
        else:
            # Create new chapter
            chapter_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO chapters (
                    id, slug, title, course_id, week_number, module_number, chapter_number,
                    word_count, estimated_read_time, status, published_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                chapter_id, metadata["slug"], metadata["title"], "physical-ai-robotics",
                metadata["week_number"], metadata["module_number"], metadata["chapter_number"],
                metadata["word_count"], metadata["estimated_read_time"], "PUBLISHED", now, now, now
            ))
            chapters_created += 1
            print(f"  Created: {metadata['slug']}")

    conn.commit()
    conn.close()

    print(f"\nSeeding complete!")
    print(f"  Created: {chapters_created}")
    print(f"  Updated: {chapters_updated}")


def main():
    """Main entry point."""
    project_root = Path(__file__).parent.parent.parent
    docs_path = project_root / "docusaurus" / "docs"
    db_path = Path(__file__).parent.parent / "textbook.db"

    if not docs_path.exists():
        print(f"Error: Docs path not found: {docs_path}")
        sys.exit(1)

    if not db_path.exists():
        print(f"Error: Database not found: {db_path}")
        sys.exit(1)

    seed_chapters(docs_path, db_path)


if __name__ == "__main__":
    main()
