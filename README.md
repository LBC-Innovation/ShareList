# Sharelist

Cross-platform music playlist sharing. Connect Spotify, Apple Music, or YouTube Music and share playlists across platforms — no matter which service your friends use.

## Quick start

```bash
git clone https://github.com/zhwatts/sharelist.git
cd sharelist
npm run setup
```

The setup command installs all dependencies and creates a `.env` file from the example template.

Then fill in your credentials in `.env` and start the development servers:

```bash
npm run dev
```

This runs the API (port 3001) and the frontend (port 5173) concurrently.

## Project structure

```
apps/
  api/    — Node/Express backend
  web/    — React frontend
packages/
  shared/ — Shared types and utilities
scripts/  — Automation and tooling scripts
```

## Environment variables

Copy `.env.example` to `.env` (the setup script does this automatically) and fill in the values below.

### Required to run locally

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (keep secret) |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` |

### GitHub automation (scripts only)

| Variable | Notes |
|---|---|
| `GITHUB_TOKEN` | Personal access token — scopes: `repo`, `project` |
| `GITHUB_OWNER` | Your GitHub username |
| `GITHUB_REPO` | `sharelist` |
| `GITHUB_PROJECT_ID` | Numeric ID from the project board URL |

### Streaming service OAuth (only needed for those integrations)

| Variable | Where to get it |
|---|---|
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_REDIRECT_URI` | Must match the URI registered in the Spotify app |
| `APPLE_MUSIC_TEAM_ID` / `APPLE_MUSIC_KEY_ID` / `APPLE_MUSIC_PRIVATE_KEY` | Apple Developer account |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google Cloud Console → APIs & Services → Credentials |

## Tech stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database & Auth:** Supabase (Postgres + Auth)
- **Deployment:** Render
