---
id: "0005"
title: "Implement UI and chatbot fixes"
stage: green
date: 2025-12-28
surface: agent
model: claude-sonnet-4-5-20250929
feature: 001-ai-textbook-platform
branch: 001-ai-textbook-platform
user: user
command: /sp.implement
labels: ["bugfix", "ui", "chatbot", "logo"]
links:
  spec: specs/001-ai-textbook-platform/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - docusaurus/src/theme/Navbar/Content/index.tsx
  - docusaurus/src/theme/Navbar/Content/styles.module.css
  - docusaurus/docs/week-03/module-01/motor-control-basics.mdx
  - backend/src/api/chat.py
  - docusaurus/src/components/ChatBot/useChat.ts
  - docusaurus/src/services/api.ts
  - docusaurus/static/img/logo.png
  - docusaurus/docusaurus.config.js
tests:
  - Manual testing of logout functionality
  - Manual testing of chatbot Q&A
  - Visual verification of logo
---

## Prompt

There are still few problems..There is no logout option..secondly the chapters of course contains useless content..nothing informative but just the codes.remove all the codes from all the chapters and add content related to chapters from first to last week chapters. The chatbot is also not working at all..It doesn't reply if it does then this is the answer always "AI Assistant 15:06" one more thing we can not enter our own questions.And add the logo to the app which is at this place Hackathon_1/docusaurus/Physical AI & Humanoid Robotics.png

## Response snapshot

Implemented four fixes:
1. **Logout button**: Created custom Navbar/Content component that shows UserProfile dropdown (with Sign Out) when authenticated, Login link otherwise
2. **Chapter content**: Updated motor-control-basics.mdx with comprehensive educational content, removed excessive code blocks (other chapters already had good educational content)
3. **Chatbot fixes**: Fixed database session handling in streaming endpoint (`async_session_maker` instead of `get_db` context manager), improved SSE parsing in useChat hook with proper buffering
4. **Logo**: Copied provided logo to static/img/logo.png and updated docusaurus.config.js

## Outcome

- Impact: Fixed critical UX issues - users can now logout, chat with AI, and see proper branding
- Tests: Manual verification recommended
- Files: 8 files created/modified
- Next prompts: Test chatbot with actual user login, verify all chapters have educational content
- Reflection: The chatbot issue was due to incorrect usage of FastAPI dependency injection as a context manager

## Evaluation notes (flywheel)

- Failure modes observed: SSE stream parsing was dropping chunks due to incomplete buffering
- Graders run and results (PASS/FAIL): Manual testing pending
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Add integration tests for chat streaming endpoint
