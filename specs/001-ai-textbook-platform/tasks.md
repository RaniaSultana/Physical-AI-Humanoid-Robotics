# Tasks: AI-Native Interactive Textbook Platform

**Input**: Design documents from `/specs/001-ai-textbook-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `docusaurus/` (Docusaurus + React)
- **Backend**: `backend/src/` (FastAPI)
- **Tests**: `backend/tests/`, `docusaurus/src/__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan with docusaurus/ and backend/ directories
- [x] T002 [P] Initialize Docusaurus project with React 18 and MDX in docusaurus/
- [x] T003 [P] Initialize FastAPI project with Python 3.11+ in backend/
- [x] T004 [P] Configure ESLint, Prettier for frontend in docusaurus/.eslintrc.js
- [x] T005 [P] Configure Ruff, Black for backend in backend/pyproject.toml
- [x] T006 [P] Create backend/requirements.txt with FastAPI, SQLAlchemy, Qdrant, OpenAI dependencies
- [x] T007 [P] Create docusaurus/package.json with Docusaurus 3.x, React 18, BetterAuth dependencies
- [x] T008 Setup environment configuration in backend/src/core/config.py
- [x] T009 [P] Create .env.example files for both frontend and backend

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### Database & Core Infrastructure

- [x] T010 Setup database connection with async SQLAlchemy in backend/src/core/database.py
- [x] T011 Create Alembic migration framework in backend/alembic/
- [x] T012 Create Base model with timestamps mixin in backend/src/models/base.py
- [x] T013 [P] Create User model with background fields in backend/src/models/user.py
- [x] T014 [P] Create Session model for auth in backend/src/models/session.py
- [x] T015 [P] Create Chapter model with hierarchy in backend/src/models/content.py
- [x] T016 Run initial database migration to create core tables

### Authentication Framework

- [x] T017 Implement password hashing utilities in backend/src/core/security.py
- [x] T018 Implement JWT token generation/validation in backend/src/core/security.py
- [x] T019 Create auth dependency for route protection in backend/src/core/dependencies.py
- [x] T020 Create FastAPI app entry point with CORS in backend/src/main.py

### Vector Database Setup

- [x] T021 Setup Qdrant client connection in backend/src/services/qdrant_client.py
- [x] T022 Create textbook_content collection schema in backend/scripts/setup_qdrant.py
- [x] T023 Implement embedding service with OpenAI in backend/src/services/embedding_service.py

### Frontend Base

- [x] T024 Configure Docusaurus theme and navigation in docusaurus/docusaurus.config.js
- [x] T025 Create sidebar configuration in docusaurus/sidebars.js
- [x] T026 Setup API client service in docusaurus/src/services/api.ts
- [x] T027 Create auth context provider in docusaurus/src/context/AuthContext.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Read Structured Course Content (Priority: P1)

**Goal**: Students can access and navigate the textbook through a web interface with proper formatting

**Independent Test**: Load the textbook, navigate between chapters/modules/lessons, verify content renders correctly

### Implementation for User Story 1

- [x] T028 [P] [US1] Create sample MDX content for week-01/module-01 in docusaurus/docs/
- [x] T029 [P] [US1] Create ReadingProgress model in backend/src/models/reading_progress.py
- [x] T030 [P] [US1] Create ContentChunk model for Qdrant sync in backend/src/models/content.py
- [x] T031 [US1] Implement content router GET /content/chapters in backend/src/api/content.py
- [x] T032 [US1] Implement GET /content/chapters/{slug} endpoint in backend/src/api/content.py
- [x] T033 [US1] Create ChapterNav component for navigation in docusaurus/src/components/ChapterNav/index.tsx
- [x] T034 [US1] Create ProgressBar component in docusaurus/src/components/ProgressBar/index.tsx
- [x] T035 [US1] Implement reading position persistence in docusaurus/src/hooks/useReadingProgress.ts
- [x] T036 [US1] Style MDX content blocks (code, equations, diagrams) in docusaurus/src/css/custom.css
- [x] T037 [US1] Create content indexing script for Qdrant in backend/scripts/index_content.py

**Checkpoint**: User Story 1 complete - students can read and navigate content

---

## Phase 4: User Story 2 - AI-Powered Question Answering (Priority: P1)

**Goal**: RAG-based AI chatbot answers questions using ONLY textbook content with citations

**Independent Test**: Ask questions, verify responses cite only book content, verify out-of-scope decline

### Implementation for User Story 2

- [x] T038 [P] [US2] Create Conversation model in backend/src/models/conversation.py
- [x] T039 [P] [US2] Create Message model with citations in backend/src/models/conversation.py
- [x] T040 [US2] Implement RAG service with Qdrant retrieval in backend/src/services/rag_service.py
- [x] T041 [US2] Create Q&A Agent with OpenAI SDK in backend/src/agents/qa_agent.py
- [x] T042 [US2] Implement POST /chat/ask endpoint in backend/src/api/chat.py
- [x] T043 [US2] Implement POST /chat/stream endpoint with SSE in backend/src/api/chat.py
- [x] T044 [US2] Implement conversation CRUD endpoints in backend/src/api/chat.py
- [x] T045 [US2] Create ChatBot component with message interface in docusaurus/src/components/ChatBot/index.tsx
- [x] T046 [US2] Implement citation display with chapter links in docusaurus/src/components/ChatBot/Citation.tsx
- [x] T047 [US2] Add streaming response handling in docusaurus/src/components/ChatBot/useChat.ts
- [x] T048 [US2] Integrate ChatBot into Docusaurus layout in docusaurus/src/theme/Root.tsx

**Checkpoint**: User Story 2 complete - AI Q&A with citations works

---

## Phase 5: User Story 8 - Highlight & Ask (Priority: P1)

**Goal**: Users select text and get instant AI explanations without leaving reading flow

**Independent Test**: Select text, trigger context menu, verify AI responds with contextual explanation

### Implementation for User Story 8

- [x] T049 [US8] Create Highlight Agent for contextual explanations in backend/src/agents/highlight_agent.py
- [x] T050 [US8] Implement POST /chat/highlight endpoint in backend/src/api/chat.py
- [x] T051 [US8] Create text selection hook in docusaurus/src/hooks/useTextSelection.ts (in HighlightAsk/useTextSelection.ts)
- [x] T052 [US8] Create FloatingMenu component for actions in docusaurus/src/components/HighlightAsk/index.tsx
- [x] T053 [US8] Create HighlightPopover for AI responses in docusaurus/src/components/HighlightAsk/index.tsx
- [x] T054 [US8] Implement quick actions (Explain, Example, Simplify, Go Deeper) in docusaurus/src/components/HighlightAsk/actions.ts
- [x] T055 [US8] Add mini-chat for follow-up questions in docusaurus/src/components/HighlightAsk/MiniChat.tsx
- [x] T056 [US8] Integrate HighlightAsk into MDX wrapper in docusaurus/src/theme/MDXContent/index.tsx

**Checkpoint**: User Story 8 complete - Highlight & Ask feature works

---

## Phase 6: User Story 9 - Interactive Code Playground (Priority: P1)

**Goal**: Run and modify code examples directly in the textbook with real-time output

**Independent Test**: Run embedded code examples, modify and re-run, verify output displays correctly

### Implementation for User Story 9

- [x] T057 [P] [US9] Create CodeExecution model in backend/src/models/code_execution.py
- [x] T058 [US9] Create CodePlayground component with Monaco editor in docusaurus/src/components/CodePlayground/index.tsx
- [x] T059 [US9] Integrate Pyodide for Python execution in docusaurus/src/components/CodePlayground/usePyodide.ts
- [x] T060 [US9] Implement output panel with real-time results in docusaurus/src/components/CodePlayground/index.tsx
- [x] T061 [US9] Add "Reset to original" functionality in docusaurus/src/components/CodePlayground/controls.ts
- [x] T062 [US9] Implement "Ask AI to help fix" for errors in docusaurus/src/components/CodePlayground/AIHelp.tsx
- [x] T063 [US9] Create MDX component wrapper for code blocks in docusaurus/src/components/CodePlayground/MDXCode.tsx
- [x] T064 [US9] Register CodePlayground as MDX component in docusaurus/src/theme/MDXComponents.tsx

**Checkpoint**: User Story 9 complete - Code Playground works

---

## Phase 7: User Story 3 - User Authentication & Personalization (Priority: P2)

**Goal**: Users create accounts, log in, and have preferences/progress saved across sessions

**Independent Test**: Create account, log in/out, verify session data persists

### Implementation for User Story 3

- [x] T065 [US3] Implement POST /auth/register endpoint in backend/src/api/auth.py
- [x] T066 [US3] Implement POST /auth/login endpoint in backend/src/api/auth.py
- [x] T067 [US3] Implement POST /auth/logout endpoint in backend/src/api/auth.py
- [x] T068 [US3] Implement GET /auth/me endpoint in backend/src/api/auth.py
- [x] T069 [US3] Implement OAuth callbacks for Google/GitHub/Apple in backend/src/api/auth.py
- [x] T070 [US3] Create LoginForm component in docusaurus/src/components/Auth/LoginForm.tsx
- [x] T071 [US3] Create RegisterForm component in docusaurus/src/components/Auth/RegisterForm.tsx
- [x] T072 [US3] Create OAuthButtons component (Google, GitHub, Apple) in docusaurus/src/components/Auth/OAuthButtons.tsx
- [x] T073 [US3] Create UserProfile component in docusaurus/src/components/Auth/UserProfile.tsx
- [x] T074 [US3] Add auth state persistence in docusaurus/src/context/AuthContext.tsx
- [x] T075 [US3] Create login/register pages in docusaurus/src/pages/

**Checkpoint**: User Story 3 complete - Authentication works

---

## Phase 8: User Story 4 - Background-Based Content Personalization (Priority: P2)

**Goal**: AI adapts explanations based on user's declared educational background

**Independent Test**: Set different backgrounds, compare AI explanations for the same concept

### Implementation for User Story 4

- [x] T076 [US4] Implement PUT /users/background endpoint in backend/src/api/auth.py
- [x] T077 [US4] Extend Q&A Agent to include user background in context in backend/src/agents/qa_agent.py
- [x] T078 [US4] Create BackgroundSelector component in docusaurus/src/components/Onboarding/BackgroundSelector.tsx
- [x] T079 [US4] Create onboarding flow for new users in docusaurus/src/components/Onboarding/index.tsx
- [x] T080 [US4] Add background context to all AI requests in docusaurus/src/services/api.ts
- [x] T081 [US4] Store and retrieve user background in auth context in docusaurus/src/context/AuthContext.tsx

**Checkpoint**: User Story 4 complete - Background personalization works

---

## Phase 9: User Story 10 - AI-Generated Quizzes (Priority: P2)

**Goal**: AI generates quiz questions from chapter content for self-assessment

**Independent Test**: Generate quizzes for chapters, answer questions, verify feedback and scores

### Implementation for User Story 10

- [x] T082 [P] [US10] Create Quiz model in backend/src/models/quiz.py
- [x] T083 [P] [US10] Create QuizAttempt model in backend/src/models/quiz.py
- [x] T084 [US10] Create Quiz Agent for question generation in backend/src/agents/quiz_agent.py
- [x] T085 [US10] Implement quiz service with scoring in backend/src/services/quiz_service.py
- [x] T086 [US10] Implement POST /chapters/{id}/quiz endpoint in backend/src/api/quiz.py
- [x] T087 [US10] Implement quiz attempt endpoints in backend/src/api/quiz.py
- [x] T088 [US10] Create QuizPanel component in docusaurus/src/components/QuizPanel/index.tsx
- [x] T089 [US10] Create QuestionCard component (MCQ, True/False) in docusaurus/src/components/QuizPanel/QuestionCard.tsx
- [x] T090 [US10] Create QuizResults component with explanations in docusaurus/src/components/QuizPanel/Results.tsx
- [x] T091 [US10] Add "Test My Knowledge" button to chapter layout in docusaurus/src/theme/DocItem/Footer.tsx

**Checkpoint**: User Story 10 complete - Quiz generation works

---

## Phase 10: User Story 11 - Spaced Repetition Flashcards (Priority: P2)

**Goal**: Auto-generate flashcards and schedule reviews using SM-2 algorithm

**Independent Test**: Generate flashcards, complete review sessions, verify scheduling works

### Implementation for User Story 11

- [x] T092 [P] [US11] Create Flashcard model in backend/src/models/flashcard.py
- [x] T093 [P] [US11] Create FlashcardDeck model in backend/src/models/flashcard.py
- [x] T094 [P] [US11] Create FlashcardReview model in backend/src/models/flashcard.py
- [x] T095 [US11] Create Flashcard Agent for card generation in backend/src/agents/flashcard_agent.py
- [x] T096 [US11] Implement SM-2 algorithm in backend/src/services/flashcard_service.py
- [x] T097 [US11] Implement flashcard deck endpoints in backend/src/api/flashcard.py
- [x] T098 [US11] Implement review session endpoints in backend/src/api/flashcard.py
- [x] T099 [US11] Create FlashcardDeck component in docusaurus/src/components/FlashcardDeck/index.tsx
- [x] T100 [US11] Create FlashcardReview component with flip animation in docusaurus/src/components/FlashcardDeck/Review.tsx
- [x] T101 [US11] Create quality rating buttons (Easy/Medium/Hard/Forgot) in docusaurus/src/components/FlashcardDeck/Rating.tsx
- [x] T102 [US11] Implement Anki export functionality in backend/src/services/flashcard_service.py
- [x] T103 [US11] Add due cards notification to dashboard in docusaurus/src/components/Dashboard/DueCards.tsx

**Checkpoint**: User Story 11 complete - Flashcards with spaced repetition work

---

## Phase 11: User Story 7 - Author Content Management (Priority: P2)

**Goal**: Authors can create, edit, and publish textbook content

**Independent Test**: Create, edit, and publish content through the author interface

### Implementation for User Story 7

- [x] T104 [US7] Implement author role check middleware in backend/src/core/dependencies.py
- [x] T105 [US7] Implement authoring CRUD endpoints in backend/src/api/content.py
- [x] T106 [US7] Implement publish/unpublish endpoints in backend/src/api/content.py
- [x] T107 [US7] Implement chapter reorder endpoint in backend/src/api/content.py
- [x] T108 [US7] Create MarkdownEditor component with preview in docusaurus/src/components/Authoring/MarkdownEditor.tsx
- [x] T109 [US7] Create ChapterList component for authoring in docusaurus/src/components/Authoring/ChapterList.tsx
- [x] T110 [US7] Create authoring dashboard page in docusaurus/src/pages/authoring/index.tsx
- [x] T111 [US7] Trigger re-indexing on content publish in backend/src/api/content.py

**Checkpoint**: User Story 7 complete - Authors can manage content

---

## Phase 12: User Story 5 - On-Demand Urdu Translation (Priority: P3)

**Goal**: Translate chapter content into Urdu on demand

**Independent Test**: Request translation for various chapters, verify Urdu output quality

### Implementation for User Story 5

- [x] T112 [P] [US5] Create TranslatedContent model in backend/src/models/personalized_content.py
- [x] T113 [US5] Create Translation Agent in backend/src/agents/translation_agent.py
- [x] T114 [US5] Implement translation service with caching in backend/src/services/translation_service.py
- [x] T115 [US5] Implement translation endpoints (GET, POST, stream) in backend/src/api/personalization.py
- [x] T116 [US5] Create TranslationToggle component in docusaurus/src/components/TranslationToggle/index.tsx
- [x] T117 [US5] Add RTL text support in Docusaurus theme in docusaurus/src/css/rtl.css
- [x] T118 [US5] Create progress indicator for translation in docusaurus/src/components/TranslationToggle/Progress.tsx

**Checkpoint**: User Story 5 complete - Urdu translation works

---

## Phase 13: User Story 6 - Personalized Chapter Generation (Priority: P3)

**Goal**: Generate personalized chapter versions based on user interests and background

**Independent Test**: Generate personalized versions with different settings, compare output

### Implementation for User Story 6

- [x] T119 [P] [US6] Create PersonalizedContent model in backend/src/models/personalized_content.py
- [x] T120 [US6] Create Personalization Agent in backend/src/agents/personalization_agent.py
- [x] T121 [US6] Implement personalization service in backend/src/services/personalization_service.py
- [x] T122 [US6] Implement personalization endpoints (GET, POST, stream) in backend/src/api/personalization.py
- [x] T123 [US6] Create PersonalizationControls component in docusaurus/src/components/PersonalizationControls/index.tsx
- [x] T124 [US6] Create InterestInput component in docusaurus/src/components/PersonalizationControls/InterestInput.tsx
- [x] T125 [US6] Add version switcher (original/personalized) in docusaurus/src/components/PersonalizationControls/VersionSwitcher.tsx

**Checkpoint**: User Story 6 complete - Chapter personalization works

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T126 [P] Add error boundary component in docusaurus/src/components/ErrorBoundary.tsx
- [x] T127 [P] Implement global error handling in backend/src/core/exceptions.py
- [x] T128 [P] Add loading states and skeletons across all components
- [x] T129 [P] Add logging throughout backend services in backend/src/core/logging.py
- [x] T130 Performance optimization: lazy load heavy components
- [x] T131 Security hardening: rate limiting, input sanitization
- [x] T132 Create user dashboard with progress overview in docusaurus/src/pages/dashboard.tsx
- [x] T133 Run quickstart.md validation and update if needed
- [x] T134 Create deployment configuration for Vercel (frontend) and Railway (backend)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-13)**: All depend on Foundational phase completion
- **Polish (Phase 14)**: Depends on all desired user stories being complete

### User Story Dependencies

All user stories can start after Phase 2 (Foundational) is complete:

| Story | Priority | Dependencies | Notes |
|-------|----------|--------------|-------|
| US1 - Read Content | P1 | Foundation | Core content delivery |
| US2 - AI Q&A | P1 | Foundation, US1 content indexed | Needs indexed content |
| US8 - Highlight & Ask | P1 | Foundation, US2 RAG service | Extends Q&A |
| US9 - Code Playground | P1 | Foundation | Independent |
| US3 - Authentication | P2 | Foundation | Enables personalization |
| US4 - Background Personalization | P2 | US3 auth | Needs user profiles |
| US10 - Quizzes | P2 | US3 auth, US1 content | Needs auth + content |
| US11 - Flashcards | P2 | US3 auth, US1 content | Needs auth + content |
| US7 - Authoring | P2 | US3 auth (author role) | Needs auth |
| US5 - Urdu Translation | P3 | US3 auth, US1 content | Needs auth + content |
| US6 - Chapter Personalization | P3 | US3 auth, US4 background | Needs background |

### Parallel Opportunities

**Within Phase 1 (Setup)**:
- T002, T003, T004, T005, T006, T007, T009 can all run in parallel

**Within Phase 2 (Foundational)**:
- T013, T014, T015 (models) can run in parallel
- T024, T025, T026, T027 (frontend base) can run in parallel after T002

**Across User Stories** (after Phase 2):
- US1, US9 have no inter-dependencies and can run in parallel
- US3 can start immediately after Phase 2
- US2 and US8 can run after US1 completes content indexing

---

## Parallel Example: Phase 2 Foundation

```bash
# Launch all model creations together:
Task: "Create User model in backend/src/models/user.py"
Task: "Create Session model in backend/src/models/session.py"
Task: "Create Chapter model in backend/src/models/content.py"

# Launch all frontend base tasks together:
Task: "Configure Docusaurus theme in docusaurus/docusaurus.config.js"
Task: "Create sidebar configuration in docusaurus/sidebars.js"
Task: "Setup API client in docusaurus/src/services/api.ts"
Task: "Create auth context in docusaurus/src/context/AuthContext.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 8, 9)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1 - Read Content
4. Complete Phase 4: US2 - AI Q&A
5. Complete Phase 5: US8 - Highlight & Ask
6. Complete Phase 6: US9 - Code Playground
7. **STOP and VALIDATE**: Core learning experience is complete
8. Deploy MVP demo

### Incremental Delivery

After MVP:
1. Add US3 (Auth) + US4 (Background) → Personalized AI responses
2. Add US10 (Quizzes) + US11 (Flashcards) → Self-assessment features
3. Add US7 (Authoring) → Content management
4. Add US5 (Translation) + US6 (Personalization) → Advanced personalization

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 134 |
| Setup Phase | 9 tasks |
| Foundational Phase | 18 tasks |
| User Story Tasks | 98 tasks |
| Polish Phase | 9 tasks |
| Parallel Opportunities | 45+ tasks marked [P] |
| MVP Scope | US1, US2, US8, US9 (41 tasks after foundation) |

### Tasks per User Story

| User Story | Priority | Task Count |
|------------|----------|------------|
| US1 - Read Content | P1 | 10 |
| US2 - AI Q&A | P1 | 11 |
| US8 - Highlight & Ask | P1 | 8 |
| US9 - Code Playground | P1 | 8 |
| US3 - Authentication | P2 | 11 |
| US4 - Background | P2 | 6 |
| US10 - Quizzes | P2 | 10 |
| US11 - Flashcards | P2 | 12 |
| US7 - Authoring | P2 | 8 |
| US5 - Translation | P3 | 7 |
| US6 - Personalization | P3 | 7 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
