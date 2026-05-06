---
id: 1
title: Debugging localhost connection refused error
stage: general
date: 2026-01-01
surface: agent
model: claude-sonnet-4.5
feature: none
branch: 001-ai-textbook-platform
user: apple
command: none
labels: [debug, server, connection, localhost]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - none
tests:
  - lsof -i :3000
  - lsof -i :8000
---

## Prompt

after running local host it says "This site can’t be reached
localhost refused to connect.
Try:

Checking the connection
Checking the proxy and the firewall
ERR_CONNECTION_REFUSED"

## Response snapshot

It appears your servers are not currently running, which is why you're seeing the connection refused error. I've identified the default ports for your project:

- **Backend (API):** Port **8000**
- **Frontend (Docusaurus):** Port **3000**

I checked for active processes on these ports and confirmed that nothing is listening there.

### To resolve this, you need to start both servers...

## Outcome

- ✅ Impact: Identified the cause of connection failure and provided specific startup commands for the decoupled architecture.
- 🧪 Tests: Used `lsof` to verify no processes were bound to the expected ports.
- 📁 Files: No files modified; only investigation performed.
- 🔁 Next prompts: User to confirm servers start and UI is accessible.
- 🧠 Reflection: Decoupled frontend (Docusaurus) and backend (FastAPI/Uvicorn) require separate execution if not containerized.

## Evaluation notes (flywheel)

- Failure modes observed: Initial attempt to read a non-existent CLAUDE.md in backend/ subfolder.
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Check for env file consistency if connection persists.
