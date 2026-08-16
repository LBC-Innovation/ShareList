<!-- @format -->

Before we create infrastructure epics, here is the technical context for Sharelist:

## Repository structure

Monorepo with both frontend and backend in a single GitHub repository.
Structure will be:
/apps/web → frontend
/apps/api → backend
/packages → shared types, utilities, constants

## Deployment

Both frontend and backend deploy to Render.

- Frontend: Render static site or web service
- Backend: Render web service
- Environment variables managed in Render dashboard

## Database & auth

Supabase handles both the database (Postgres) and user authentication.

## Logging philosophy

Centralized backend logging that is structured, searchable, and easy to copy
back to Claude for diagnosis and automated fixing. Should support error
alerting and be queryable by request, user, and service.

## Key principle

This is a modern 2026 web app. Prefer simple, observable, and maintainable
over clever. Every infrastructure decision should make it easier to find and
fix problems quickly.

Please confirm you have this context before I provide the epics.
