# Data Model: AI-Native Interactive Textbook Platform

**Date**: 2025-12-24
**Feature**: 001-ai-textbook-platform
**Phase**: 1 - Design

## Overview

The data model spans two storage systems:
1. **Neon PostgreSQL**: Relational data (users, progress, personalized content, conversations)
2. **Qdrant**: Vector embeddings for RAG-based search

## PostgreSQL Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌──────────────────┐
│   users     │───┬──▶│ reading_progress│       │    chapters      │
└─────────────┘   │   └─────────────────┘       └──────────────────┘
       │          │            │                         │
       │          │            │                         │
       │          │   ┌────────┴────────┐               │
       │          │   │                 │               │
       │          ▼   ▼                 ▼               ▼
       │   ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐
       │   │ personalized_   │  │ translated_  │  │ content_chunks  │
       │   │ content         │  │ content      │  │ (metadata only) │
       │   └─────────────────┘  └──────────────┘  └─────────────────┘
       │
       ▼
┌─────────────────┐       ┌─────────────────┐
│ conversations   │──────▶│    messages     │
└─────────────────┘       └─────────────────┘
```

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),

    -- Educational background (from spec FR-012)
    background_type VARCHAR(50), -- 'cs_student', 'me_student', 'ee_student', 'hobbyist', 'professional', 'other'
    background_other TEXT,       -- Free text if background_type = 'other'
    software_experience VARCHAR(20), -- 'none', 'beginner', 'intermediate', 'advanced'
    hardware_experience VARCHAR(20), -- 'none', 'beginner', 'intermediate', 'advanced'
    learning_goals TEXT,

    -- Preferences
    preferred_language VARCHAR(10) DEFAULT 'en', -- 'en' or 'ur'

    -- Role
    role VARCHAR(20) DEFAULT 'student', -- 'student' or 'author'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Field Mapping to Spec**:
- `background_type` → FR-012 predefined list
- `background_other` → FR-012 "Other" free-text option
- `role` → Distinguishes students from authors (FR-018)

### Sessions Table

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Session metadata
    user_agent TEXT,
    ip_address INET
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Chapters Table (Content Metadata)

```sql
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Hierarchy
    course_id VARCHAR(50) NOT NULL DEFAULT 'physical-ai-robotics',
    week_number INTEGER NOT NULL,
    module_number INTEGER NOT NULL,
    chapter_number INTEGER NOT NULL,

    -- Content reference
    slug VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'week-01/module-01/introduction'
    title VARCHAR(255) NOT NULL,

    -- Metadata
    word_count INTEGER,
    estimated_read_time INTEGER, -- minutes

    -- Status (FR-019)
    status VARCHAR(20) DEFAULT 'draft', -- 'draft' or 'published'
    published_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(course_id, week_number, module_number, chapter_number)
);

CREATE INDEX idx_chapters_slug ON chapters(slug);
CREATE INDEX idx_chapters_status ON chapters(status);
CREATE INDEX idx_chapters_hierarchy ON chapters(course_id, week_number, module_number);
```

### Reading Progress Table

```sql
CREATE TABLE reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

    -- Progress tracking (FR-011)
    scroll_position FLOAT DEFAULT 0, -- 0.0 to 1.0
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Time tracking
    total_time_seconds INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, chapter_id)
);

CREATE INDEX idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_chapter ON reading_progress(chapter_id);
```

### Personalized Content Table

```sql
CREATE TABLE personalized_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

    -- Personalization parameters (FR-016)
    interests TEXT NOT NULL, -- User-specified interests for this personalization
    background_snapshot JSONB, -- Snapshot of user background at generation time

    -- Generated content (FR-017)
    content_markdown TEXT NOT NULL,

    -- Generation metadata
    model_used VARCHAR(50),
    generation_time_seconds FLOAT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, chapter_id, interests)
);

CREATE INDEX idx_personalized_content_user ON personalized_content(user_id);
CREATE INDEX idx_personalized_content_chapter ON personalized_content(chapter_id);
```

### Translated Content Table

```sql
CREATE TABLE translated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

    -- Translation (FR-014, FR-015)
    language VARCHAR(10) NOT NULL, -- 'ur' for Urdu
    content_markdown TEXT NOT NULL,

    -- Generation metadata
    model_used VARCHAR(50),
    generation_time_seconds FLOAT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(chapter_id, language)
);

CREATE INDEX idx_translated_content_chapter ON translated_content(chapter_id);
CREATE INDEX idx_translated_content_language ON translated_content(language);
```

### Conversations Table

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Context
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    title VARCHAR(255), -- Auto-generated from first message

    -- State
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_chapter ON conversations(chapter_id);
CREATE INDEX idx_conversations_active ON conversations(is_active);
```

### Messages Table

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Message content
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,

    -- For assistant messages (FR-007)
    citations JSONB, -- Array of {chapter_id, section, quote}

    -- Context mode (FR-006)
    context_mode VARCHAR(20), -- 'full_book' or 'selected_text'
    selected_text TEXT, -- If context_mode = 'selected_text'

    -- Metadata
    model_used VARCHAR(50),
    tokens_used INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_created ON messages(created_at);
```

### Content Chunks Table (Metadata for Qdrant sync)

```sql
CREATE TABLE content_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,

    -- Chunk identification
    chunk_index INTEGER NOT NULL,
    section_title VARCHAR(255),

    -- Content
    content_text TEXT NOT NULL,
    token_count INTEGER,

    -- Qdrant sync
    qdrant_point_id UUID, -- Reference to Qdrant vector
    embedded_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(chapter_id, chunk_index)
);

CREATE INDEX idx_content_chunks_chapter ON content_chunks(chapter_id);
CREATE INDEX idx_content_chunks_qdrant ON content_chunks(qdrant_point_id);
```

## Qdrant Vector Schema

### Collection: `textbook_content`

```python
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType

# Collection configuration
collection_config = {
    "collection_name": "textbook_content",
    "vectors_config": VectorParams(
        size=1536,  # OpenAI text-embedding-3-small
        distance=Distance.COSINE
    )
}

# Payload schema
payload_schema = {
    "chapter_id": PayloadSchemaType.UUID,
    "chapter_slug": PayloadSchemaType.KEYWORD,
    "week_number": PayloadSchemaType.INTEGER,
    "module_number": PayloadSchemaType.INTEGER,
    "section_title": PayloadSchemaType.TEXT,
    "content_type": PayloadSchemaType.KEYWORD,  # 'paragraph', 'code', 'definition'
    "chunk_index": PayloadSchemaType.INTEGER
}
```

### Point Structure

```python
# Example point in Qdrant
point = {
    "id": "uuid-here",
    "vector": [0.123, 0.456, ...],  # 1536 dimensions
    "payload": {
        "chapter_id": "uuid-of-chapter",
        "chapter_slug": "week-01/module-01/introduction",
        "week_number": 1,
        "module_number": 1,
        "section_title": "What is Physical AI?",
        "content_type": "paragraph",
        "chunk_index": 0,
        "content_preview": "First 200 chars of content..."  # For display
    }
}
```

### Indexing Configuration

```python
# Payload indexes for filtering
indexes = [
    ("chapter_slug", PayloadSchemaType.KEYWORD),
    ("week_number", PayloadSchemaType.INTEGER),
    ("content_type", PayloadSchemaType.KEYWORD)
]
```

## SQLAlchemy Models

### Base Model

```python
# backend/src/models/base.py
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
import uuid

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
```

### User Model

```python
# backend/src/models/user.py
from sqlalchemy import Column, String, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

class BackgroundType(enum.Enum):
    CS_STUDENT = "cs_student"
    ME_STUDENT = "me_student"
    EE_STUDENT = "ee_student"
    HOBBYIST = "hobbyist"
    PROFESSIONAL = "professional"
    OTHER = "other"

class ExperienceLevel(enum.Enum):
    NONE = "none"
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class UserRole(enum.Enum):
    STUDENT = "student"
    AUTHOR = "author"

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100))

    # Educational background
    background_type = Column(Enum(BackgroundType))
    background_other = Column(Text)
    software_experience = Column(Enum(ExperienceLevel))
    hardware_experience = Column(Enum(ExperienceLevel))
    learning_goals = Column(Text)

    # Preferences
    preferred_language = Column(String(10), default="en")

    # Role
    role = Column(Enum(UserRole), default=UserRole.STUDENT)

    # Relationships
    reading_progress = relationship("ReadingProgress", back_populates="user")
    personalized_content = relationship("PersonalizedContent", back_populates="user")
    conversations = relationship("Conversation", back_populates="user")
```

### Chapter Model

```python
# backend/src/models/content.py
from sqlalchemy import Column, String, Integer, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

class ContentStatus(enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"

class Chapter(Base, TimestampMixin):
    __tablename__ = "chapters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Hierarchy
    course_id = Column(String(50), nullable=False, default="physical-ai-robotics")
    week_number = Column(Integer, nullable=False)
    module_number = Column(Integer, nullable=False)
    chapter_number = Column(Integer, nullable=False)

    # Content reference
    slug = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)

    # Metadata
    word_count = Column(Integer)
    estimated_read_time = Column(Integer)

    # Status
    status = Column(Enum(ContentStatus), default=ContentStatus.DRAFT)
    published_at = Column(DateTime(timezone=True))

    # Relationships
    reading_progress = relationship("ReadingProgress", back_populates="chapter")
    personalized_content = relationship("PersonalizedContent", back_populates="chapter")
    translated_content = relationship("TranslatedContent", back_populates="chapter")
    chunks = relationship("ContentChunk", back_populates="chapter")
```

### Conversation Model

```python
# backend/src/models/conversation.py
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
import enum

class MessageRole(enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"

class ContextMode(enum.Enum):
    FULL_BOOK = "full_book"
    SELECTED_TEXT = "selected_text"

class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id"))
    title = Column(String(255))
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)

    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    citations = Column(JSONB)  # [{chapter_id, section, quote}]

    context_mode = Column(Enum(ContextMode))
    selected_text = Column(Text)

    model_used = Column(String(50))
    tokens_used = Column(Integer)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
```

## State Transitions

### User Registration Flow
```
[Anonymous] → register() → [Authenticated, No Background]
[Authenticated, No Background] → set_background() → [Authenticated, Full Profile]
```

### Content Publishing Flow
```
[Draft] → publish() → [Published]
[Published] → unpublish() → [Draft]
[Published] → update() → [Published] (triggers re-index)
```

### Conversation Lifecycle
```
[New] → first_message() → [Active]
[Active] → add_message() → [Active]
[Active] → close() → [Archived]
```

## Validation Rules

### User
- Email: Valid email format, unique
- Password: Minimum 8 characters
- Background type: Must be valid enum or "other" with text

### Chapter
- Slug: Unique, URL-safe characters only
- Week/Module/Chapter numbers: Positive integers
- Title: 1-255 characters

### Message
- Content: Non-empty
- Citations: Valid JSON array when present
- Selected text: Required when context_mode = "selected_text"

## Migration Strategy

1. Create tables in dependency order (users → chapters → dependent tables)
2. Seed initial chapter metadata from Docusaurus content
3. Run embedding pipeline to populate Qdrant
4. Verify foreign key constraints
