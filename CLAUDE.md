# Sharelist — Claude project context

## What this project is
Sharelist is a cross-platform music playlist sharing app. Users connect their 
streaming services (Spotify, Apple Music, YouTube Music) and share playlists 
across platforms. It does not stream audio — it is a metadata and sharing layer.

## Monorepo structure
/apps/web        → React frontend, deploys to Render
/apps/api        → Node/Express backend, deploys to Render  
/packages        → shared types, utilities, constants
/scripts         → automation scripts (GitHub, tooling)
/.claude/agents  → agent role definitions

## Tech stack
- Frontend: React, TypeScript, Ant Design (antd v6 + @ant-design/icons)
- Backend: Node.js, Express, TypeScript
- Database & auth: Supabase (Postgres + Auth)
- Deployment: Render (both frontend and backend)
- Logging: structured JSON logs, centralized and searchable

## GitHub workflow
- All work is tracked as issues on the GitHub Project board
- Issues move through: Backlog → In Progress → In Review → Done
- Every piece of work must have a corresponding issue before code is written
- The orchestrator agent manages issue creation and board movement

## Workflow rules
The GitHub Project board is the single source of truth for all work. Agents
must never self-schedule, self-assign, or begin work on any issue unless the
developer has explicitly moved it to "In Progress" first.

**Column ownership:**
- Backlog → only the developer moves items out of Backlog
- In Progress → developer-only trigger. Moving an issue here is the explicit
  instruction for agents to begin work on it
- In Review → the builder agent moves the issue here when code is complete
  and ready for developer review
- Done → only the developer marks items Done after reviewing and approving

**Agent behavior:**
- At the start of every session, the orchestrator checks the board for issues
  currently in "In Progress" — those are the only issues agents may work on
- If no issues are In Progress, agents must stop and inform the developer
  rather than pulling work from the Backlog themselves
- Agents must never move an issue backwards (e.g. In Review → In Progress)
  without explicit developer instruction
- Agents must never move an issue to Done — that is the developer's action only

**Commit cadence — mandatory:**
Agents must commit after each meaningful, self-contained unit of work. Do not
batch multiple unrelated changes into one commit or wait until a story is fully
complete before committing. Commit at natural checkpoints such as:

- After each discrete backend change (new route, middleware, migration)
- After each discrete frontend change (new component, page, or section)
- After any bug fix, regardless of size
- After updating documentation or configuration

Each commit must:
- Pass `tsc --noEmit` for any app whose files were touched before committing
- Reference the issue number in the message body (e.g. `(#23)`)
- Use a concise imperative subject line (50 chars or fewer where possible)
- Be pushed to the remote branch immediately after it is created

Never leave working, type-safe code uncommitted at the end of a task.

**No work without a ticket — no exceptions:**
This rule applies to every change, no matter how small: config edits, env var
changes, refactors, dependency updates, documentation. If there is no open
GitHub issue covering the change, the agent must create one first and wait for
the developer to move it to "In Progress" before touching any file.

Conversational answers, explanations, and architectural recommendations do not
require a ticket. Any action that writes, edits, or deletes a file does.

**Every new issue must be on the project board with Backlog status:**
The GitHub Project board is the primary visibility mechanism for all work. An
issue not on the board — or on the board with no status — is invisible to the
developer. See `.claude/agents/github-agent.md` for the exact creation
procedure, including the GraphQL mutation required to set the status.

## Agent roles
- Orchestrator: receives goals, creates issues, delegates to other agents
- Builder: writes and reviews all application code
- GitHub agent: manages the project board and issue lifecycle

## Design system

The ShareList UI uses a dark, premium aesthetic derived from the Figma reference in `_EXAMPLE FRONTEND/`.
The full design guide is at `.claude/design-system.md` — **all frontend work must follow it**.

Key rules:
- No Tailwind. No utility classes. Pure Ant Design + inline styles only.
- App is wrapped in `<ConfigProvider>` with `theme.darkAlgorithm` and ShareList tokens.
- Background `#111314`, surface cards `#1C1F21`, nav `#161819`
- Primary accent `#38BDF8` (sky blue), secondary `#4ADE80` (mint)
- Text primary `#F1F5F9`, muted `#64748B`, borders `#2A2D30`
- Font: Inter (loaded via Google Fonts in `index.html`)
- All styling via Ant Design component props and `style={{}}` inline styles
- See `.claude/design-system.md` for ConfigProvider setup and component patterns

## Frontend architecture — API-only
The frontend (`apps/web`) must never interact with Supabase directly. All data
access and authentication goes through the Express API (`apps/api`).

- No `@supabase/supabase-js` in `apps/web`
- No Supabase URL or anon key in any `VITE_*` env var
- The only env var the frontend needs is `VITE_API_URL`
- Auth tokens received from the API are stored client-side and sent as
  `Authorization: Bearer <token>` headers on subsequent API requests

## Out of scope
- Audio streaming or playback
- Podcast or audiobook content
- Mobile app (web first)
- Downloading or offline access

## Logging philosophy
Structured JSON logs on the backend. Every error includes stack trace and 
request context. Logs should be easy to copy directly to Claude for diagnosis.

## Deployment rules
- Never commit secrets or .env files
- All env vars live in Render dashboard
- Pushing to main triggers automatic deployment
- Failed deploys must not affect the running production service