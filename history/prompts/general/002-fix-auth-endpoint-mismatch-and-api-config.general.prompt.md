---
id: 002
title: Fix Auth Endpoint Mismatch and API Config
stage: misc
date: 2026-01-02
surface: agent
model: claude-sonnet-4-5-20250929
feature: none
branch: 001-ai-textbook-platform
user: apple
command: none
labels: ["auth", "api", "fix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - docusaurus/src/services/api.ts
  - docusaurus/src/context/AuthContext.tsx
tests:
  - none
---

## Prompt

In docusaurus/src/services/api.ts and docusaurus/src/context/AuthContext.tsx:
1. Fix the mismatch where updateBackground calls /users/background instead of /auth/me/background.
2. Ensure login/register/logout correctly update the session state.
3. Verify the token storage key matches across all files.
4. Ensure the API base URL is correct for the environment.
Write the necessary code changes.

## Response snapshot

I have updated the API service and verified the authentication context.
Key changes:
1. Updated `api.ts`: Changed the `updateBackground` endpoint from `/users/background` to `/auth/me/background`.
2. Updated `api.ts`: Configured `API_BASE_URL` to use `process.env.REACT_APP_API_URL` with a fallback, ensuring environment consistency.
3. Verified `AuthContext.tsx`: Confirmed that `login`, `register`, and `logout` properly update the session state and use `TOKEN_KEY` ("ai_textbook_token") consistently.

## Outcome

- ✅ Impact: Corrected API endpoints and improved environment flexibility.
- 🧪 Tests: none
- 📁 Files: /Users/apple/Documents/Claude projects/Hackathon_1/docusaurus/src/services/api.ts, /Users/apple/Documents/Claude projects/Hackathon_1/docusaurus/src/context/AuthContext.tsx
- 🔁 Next prompts: none
- 🧠 Reflection: The mismatch in the background update endpoint was a direct fix. Adding environment variable support for the base URL makes the frontend more portable.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
