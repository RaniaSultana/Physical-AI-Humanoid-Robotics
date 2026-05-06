# Implementation Plan: AI-Native Interactive Textbook Platform

**Branch**: `001-ai-textbook-platform` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-textbook-platform/spec.md`

## Summary

Build an AI-native interactive textbook platform for teaching "Physical AI & Humanoid Robotics" using a documentation-first architecture. The platform combines Docusaurus for content delivery with a FastAPI backend powering RAG-based AI services, personalization, and user management. Content is indexed in Qdrant vector database for semantic search, with user data persisted in Neon PostgreSQL. Authentication via BetterAuth (Google, GitHub, Apple, Email) enables personalized learning experiences including:

- **RAG-based Q&A** with citations from textbook content
- **Highlight & Ask** - contextual AI help on selected text
- **Interactive Code Playground** - run Python/JS code in-browser
- **AI-Generated Quizzes** - self-assessment after each chapter
- **Spaced Repetition Flashcards** - long-term knowledge retention
- **Urdu Translation** and **Chapter Personalization**

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript/JavaScript (frontend/Docusaurus)
**Primary Dependencies**:
- Frontend: Docusaurus 3.x, React 18, MDX, Pyodide (Python in browser)
- Backend: FastAPI, Pydantic, SQLAlchemy, BetterAuth
- AI: OpenAI Agents SDK, Qdrant Client
- Auth: BetterAuth (Email, Google OAuth, GitHub OAuth, Apple Sign-In)
**Storage**:
- Neon PostgreSQL (users, progress, quizzes, flashcards, personalized content)
- Qdrant Cloud Free Tier (vector embeddings for RAG)
**Testing**: pytest (backend), Jest/Vitest (frontend)
**Target Platform**: Web (modern browsers), deployed to Vercel/GitHub Pages (frontend) + cloud provider (backend)
**Project Type**: Web application (frontend + backend)
**Performance Goals**:
- Page load < 2s (SC-002)
- AI response < 5s for Q&A
- Highlight & Ask response < 3s (SC-016)
- Translation < 30s (SC-007)
- Chapter personalization < 60s (SC-008)
- Quiz generation < 15s (SC-021)
- Code execution < 10s (SC-018)
**Constraints**:
- API p95 latency < 200ms reads, < 500ms writes
- Support 500 concurrent users (SC-012)
- 99.5% uptime (SC-013)
**Scale/Scope**: Single course, ~500 users, 12-16 weeks of content

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence/Compliance |
|-----------|--------|---------------------|
| I. Code Quality | ✅ PASS | Linting (Ruff/ESLint), type hints (Python/TypeScript), clear module separation |
| II. Testing Standards | ✅ PASS | pytest + Jest, contract tests for API, integration tests for RAG pipeline |
| III. UX Consistency | ✅ PASS | Docusaurus design system, progress indicators for AI ops, error messages defined |
| IV. Performance | ✅ PASS | Targets defined (SC-002, SC-007, SC-008, SC-012), Qdrant for fast retrieval |
| V. Security | ✅ PASS | BetterAuth for auth, input validation on all endpoints, no secrets in code |
| VI. Simplicity | ✅ PASS | Two-component architecture (Docusaurus + FastAPI), minimal abstractions |

**Gate Status**: PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-textbook-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
│   ├── auth-api.yaml
│   ├── chat-api.yaml
│   ├── content-api.yaml
│   ├── personalization-api.yaml
│   ├── quiz-api.yaml
│   └── flashcard-api.yaml
└── tasks.md             # Phase 2 output (/sp.tasks command)
```

### Source Code (repository root)

```text
# Web application structure (frontend + backend)

docusaurus/
├── docs/                    # Course content in MDX
│   ├── week-01/
│   │   ├── module-01/
│   │   │   ├── chapter-01.mdx
│   │   │   └── chapter-02.mdx
│   │   └── module-02/
│   └── week-02/
├── src/
│   ├── components/          # Custom React components
│   │   ├── ChatBot/         # AI Q&A interface
│   │   ├── HighlightAsk/    # Contextual AI on text selection
│   │   ├── CodePlayground/  # Interactive code editor with Pyodide
│   │   ├── QuizPanel/       # AI-generated quiz interface
│   │   ├── FlashcardDeck/   # Spaced repetition flashcards
│   │   ├── PersonalizationControls/
│   │   ├── TranslationToggle/
│   │   └── AuthComponents/  # Login buttons (Google/GitHub/Apple/Email)
│   ├── pages/               # Custom pages (login, profile, dashboard)
│   ├── theme/               # Docusaurus theme customizations
│   └── services/            # API client services
├── static/                  # Static assets
├── docusaurus.config.js
├── sidebars.js
└── package.json

backend/
├── src/
│   ├── api/                 # FastAPI routers
│   │   ├── auth.py          # Auth endpoints (OAuth + email)
│   │   ├── chat.py          # RAG Q&A + Highlight & Ask
│   │   ├── content.py       # Chapter content & progress
│   │   ├── quiz.py          # Quiz generation & attempts
│   │   ├── flashcard.py     # Flashcard decks & reviews
│   │   └── personalization.py
│   ├── models/              # SQLAlchemy models
│   │   ├── user.py
│   │   ├── content.py
│   │   ├── conversation.py
│   │   ├── quiz.py          # Quiz, QuizAttempt
│   │   └── flashcard.py     # Flashcard, FlashcardReview
│   ├── services/            # Business logic
│   │   ├── rag_service.py
│   │   ├── embedding_service.py
│   │   ├── translation_service.py
│   │   ├── personalization_service.py
│   │   ├── quiz_service.py  # Quiz generation & scoring
│   │   └── flashcard_service.py  # Spaced repetition logic
│   ├── agents/              # OpenAI Agents SDK implementations
│   │   ├── qa_agent.py
│   │   ├── highlight_agent.py    # Contextual explanations
│   │   ├── quiz_agent.py         # Question generation
│   │   ├── flashcard_agent.py    # Flashcard generation
│   │   ├── translation_agent.py
│   │   └── personalization_agent.py
│   ├── core/                # Config, dependencies, middleware
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   └── main.py              # FastAPI app entry point
├── tests/
│   ├── contract/            # API contract tests
│   ├── integration/         # RAG pipeline, DB integration
│   └── unit/                # Service unit tests
├── scripts/
│   ├── index_content.py     # Content indexing pipeline
│   └── seed_db.py           # Database seeding
├── requirements.txt
└── pyproject.toml

shared/
└── types/                   # Shared TypeScript/Python types (optional)
```

**Structure Decision**: Web application with clear frontend/backend separation. Docusaurus handles all content rendering and UI, while FastAPI provides AI services, auth, and data persistence. This allows independent deployment and scaling.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Browser                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Docusaurus (Vercel/GH Pages)                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────────┐│
│  │ Course     │ │ ChatBot +  │ │ Code       │ │ Quiz + Flashcard       ││
│  │ Content    │ │ Highlight  │ │ Playground │ │ Components             ││
│  │ (MDX)      │ │ & Ask      │ │ (Pyodide)  │ │                        ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Auth (BetterAuth): Google | GitHub | Apple | Email/Password        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ REST API
┌─────────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend (Cloud)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ Auth         │ │ Chat/RAG     │ │ Quiz         │ │ Flashcard      │  │
│  │ Service      │ │ Service      │ │ Service      │ │ Service        │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      OpenAI Agents SDK                              │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐  │ │
│  │  │ Q&A     │ │Highlight│ │ Quiz    │ │Flashcard│ │ Translation  │  │ │
│  │  │ Agent   │ │ Agent   │ │ Agent   │ │ Agent   │ │ Agent        │  │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
           │                                               │
           ▼                                               ▼
┌───────────────────────┐                 ┌─────────────────────────────┐
│ Qdrant Cloud          │                 │ Neon PostgreSQL             │
│ (Vector DB)           │                 │                             │
│ - Content chunks      │                 │ - Users & Auth              │
│ - Embeddings          │                 │ - Quiz attempts & scores    │
│                       │                 │ - Flashcard decks & reviews │
│                       │                 │ - Reading progress          │
│                       │                 │ - Personalized content      │
└───────────────────────┘                 └─────────────────────────────┘
```

## Key Design Decisions

### 1. Docusaurus for Content Delivery
- **Decision**: Use Docusaurus as the primary frontend framework
- **Rationale**: Purpose-built for documentation, excellent MDX support, built-in navigation, SEO-friendly, fast static generation
- **Alternative Rejected**: Custom React app (more work, less features for documentation use case)

### 2. FastAPI Backend
- **Decision**: Separate FastAPI service for all dynamic features
- **Rationale**: Python ecosystem for AI/ML, async support, automatic OpenAPI docs, easy deployment
- **Alternative Rejected**: Node.js backend (less mature AI libraries), serverless functions only (complexity for stateful RAG)

### 3. Qdrant for Vector Storage
- **Decision**: Qdrant Cloud Free Tier for embedding storage and retrieval
- **Rationale**: Free tier sufficient for single course, excellent Python SDK, fast similarity search
- **Alternative Rejected**: Pinecone (paid), Chroma (less production-ready), pgvector (requires more setup)

### 4. Neon PostgreSQL
- **Decision**: Serverless PostgreSQL for relational data
- **Rationale**: Free tier, serverless scaling, familiar SQL, good for structured user/content data
- **Alternative Rejected**: Supabase (more overhead), SQLite (not suitable for production multi-user)

### 5. BetterAuth
- **Decision**: BetterAuth for authentication
- **Rationale**: Modern, TypeScript-first, supports email/password, easy to integrate with FastAPI
- **Alternative Rejected**: Auth0/Clerk (paid tiers for features needed), custom auth (security risk)

### 6. OpenAI Agents SDK
- **Decision**: OpenAI Agents SDK for AI orchestration
- **Rationale**: Structured agent patterns, tool use support, conversation management
- **Alternative Rejected**: Raw API calls (more boilerplate), LangChain (heavier dependency)

### 7. Pyodide for Code Playground
- **Decision**: Use Pyodide (Python compiled to WebAssembly) for in-browser code execution
- **Rationale**: No server-side execution needed, secure sandboxing, supports numpy/scipy, zero-cost scaling
- **Alternative Rejected**: Server-side execution (security risks, scaling costs), Judge0 (external dependency, latency)

### 8. SM-2 Spaced Repetition Algorithm
- **Decision**: Implement SuperMemo SM-2 algorithm for flashcard scheduling
- **Rationale**: Well-proven algorithm, simple to implement, effective for long-term retention
- **Alternative Rejected**: Leitner system (less adaptive), Anki's SM-2 variant (more complex, marginal benefit)

### 9. AI-Generated Quiz Questions
- **Decision**: Use OpenAI Agents SDK to generate MCQ/True-False questions from chapter content
- **Rationale**: Context-aware questions, difficulty calibration, explanation generation
- **Alternative Rejected**: Pre-authored questions only (doesn't scale), random question banks (no context)

### 10. Highlight & Ask Feature
- **Decision**: Text selection triggers contextual AI explanation using selected text + surrounding context
- **Rationale**: Reduces friction for getting help, leverages existing RAG infrastructure
- **Alternative Rejected**: Separate explanation lookup (less contextual), tooltip-only definitions (limited depth)

## Content Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Author writes   │     │ Build pipeline  │     │ Index pipeline  │
│ MDX content     │ ──▶ │ generates HTML  │ ──▶ │ chunks & embeds │
│ in Docusaurus   │     │ for Docusaurus  │     │ into Qdrant     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ RAG Service     │
                                                │ queries Qdrant  │
                                                │ for Q&A         │
                                                └─────────────────┘
```

**Indexing Strategy**:
1. Parse MDX files to extract text content
2. Chunk content by section/paragraph (~500 tokens each)
3. Generate embeddings using OpenAI text-embedding-3-small
4. Store in Qdrant with metadata (chapter, section, week)
5. Re-index on content publish (webhook or manual trigger)

## Complexity Tracking

> No constitution violations requiring justification. Architecture follows simplicity principle with two main components.

| Decision | Justification |
|----------|---------------|
| Separate backend service | Required for AI features, auth, and data persistence - cannot be purely static |
| Vector + SQL databases | Different data patterns: vectors for semantic search, SQL for relational user data |
| OpenAI Agents SDK | Provides structured patterns for multi-step AI operations (Q&A with context, translation) |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Qdrant free tier limits | Monitor usage; single course fits comfortably in limits |
| OpenAI API costs | Use efficient prompting; consider Gemini fallback if costs spike |
| Cold start latency | Keep backend warm; use connection pooling for Neon |
| Content sync drift | Automated indexing pipeline on content publish |

## Next Steps

1. **Phase 0**: Generate `research.md` with detailed technology research
2. **Phase 1**: Generate `data-model.md`, `contracts/`, and `quickstart.md`
3. **Phase 2**: Run `/sp.tasks` to generate implementation tasks
