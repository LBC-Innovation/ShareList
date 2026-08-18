# Sharelist

Cross-platform music playlist sharing. Connect Spotify, Apple Music, or YouTube Music and share playlists across platforms — no matter which service your friends use.


<center>
  <img style="width: 320px;" alt="image" src="https://github.com/user-attachments/assets/17b86e86-17a7-43de-9218-aa9ac663dad3" />
  <img style="width: 320px;" alt="image" src="https://github.com/user-attachments/assets/263733ad-5d5a-4ce8-8c40-8d175e796a8c" />
  <img style="width: 320px;" alt="image" src="https://github.com/user-attachments/assets/283a8377-f665-4aa3-a272-8d33c6bf6ea2" />
</center>


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
| `SOUNDCLOUD_CLIENT_ID` / `SOUNDCLOUD_CLIENT_SECRET` | [SoundCloud app registration](https://soundcloud.com/you/apps) (Artist Pro required) |
| `SOUNDCLOUD_REDIRECT_URI` | Must match the URI registered in the SoundCloud app |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google Cloud Console → APIs & Services → Credentials |

## Tech stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database & Auth:** Supabase (Postgres + Auth)
- **Deployment:** Vercel — two projects from this monorepo:
  - **ShareList** (`apps/web`) — Vite frontend
  - **ShareList-API** (`apps/api`) — compiled Express API

Environment variables live in each Vercel project's settings. The frontend deploys from git; the API is typechecked and transpiled in GitHub Actions, then deployed to the **ShareList-API** project.

## User flows

These diagrams follow the live code paths. The browser talks only to the ShareList API (`apps/api`). The API talks to vendors. Authenticated API calls send `Authorization: Bearer <access_token>`; the API validates that JWT with Supabase Auth (`auth.getUser`) and checks `profiles.status` before continuing.

YouTube Music is reserved in the schema and settings copy. **Spotify**, **Apple Music**, and **SoundCloud** are wired up today.

| Participant | Resource | Vendor |
|---|---|---|
| ShareList Web | React SPA (`apps/web`) | this repo |
| ShareList API | Express (`apps/api`) | this repo |
| Supabase Auth | Auth users, sessions, confirmation email | [Supabase](https://supabase.com) |
| Supabase Postgres | `profiles`, `connected_services`, `sharelists`, `sharelist_links`, `sharelist_collaborators`, `sharelist_invites`, `sharelist_sync_log`, `track_mappings` | [Supabase](https://supabase.com) |
| Spotify Accounts | OAuth authorize + token | [Spotify](https://developer.spotify.com) |
| Spotify Web API | Playlists and tracks | [Spotify](https://developer.spotify.com) |
| MusicKit JS | In-page Apple Music authorization | [Apple](https://developer.apple.com/musickit/) (CDN) |
| Apple Music API | Library playlists and tracks | [Apple](https://developer.apple.com/documentation/applemusicapi) |
| SoundCloud | OAuth 2.1 + playlists API | [SoundCloud](https://developers.soundcloud.com/docs/api/guide) |
| Resend | Invite email delivery | [Resend](https://resend.com) |

### 1. Account signup

Email/password registration. If Supabase requires email confirmation, no session is returned and the user signs in after confirming. If a session is returned, the web app stores the access token and loads the profile.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as ShareList Web<br/>(React)
    participant API as ShareList API<br/>(Express)
    participant Auth as Supabase Auth
    participant DB as Supabase Postgres
    participant Mail as Supabase Mailer

    User->>Web: Submit email + password on /signup
    Web->>API: POST /auth/register
    API->>Auth: auth.signUp(email, password)
    Auth->>DB: INSERT auth.users
    DB->>DB: trigger handle_new_user()
    DB->>DB: INSERT public.profiles

    alt Email confirmation required
        Auth->>Mail: Send confirmation email
        Mail-->>User: Confirmation link
        Auth-->>API: user created, session = null
        API-->>Web: 201 { data.session: null }
        Web-->>User: Redirect to /signin
        User->>Mail: Open confirmation link
        Mail->>Auth: Confirm email
        Note over User,Web: User then signs in (POST /auth/login)
    else Session returned immediately
        Auth-->>API: user + session.access_token
        API-->>Web: 201 { data.session }
        Web->>Web: Store token in localStorage
        Web->>API: GET /auth/me (Bearer token)
        API->>Auth: auth.getUser(token)
        API->>DB: SELECT profiles WHERE id = user
        DB-->>API: profile
        API-->>Web: User + connectedPlatforms
        Web-->>User: Home / List Library
    end
```

Sign-in is the same session handoff without creating a user: `POST /auth/login` → `auth.signInWithPassword` → `GET /auth/me`.

If signup started from an invite link (`/signup?invite=`), the web app also calls `GET /friends/invites/:token` to prefill the email, then `POST /friends/invites/:token/accept` after a session exists.

### 2. User onboarding

First session after an account exists: connect a music service, create a ShareList from one of that service's playlists, then open the list. Platform OAuth and playlist fetch are expanded in the next two diagrams.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as ShareList Web<br/>(React)
    participant API as ShareList API<br/>(Express)
    participant Auth as Supabase Auth
    participant DB as Supabase Postgres
    participant Platform as Spotify Web API<br/>or Apple Music API

    User->>Web: Land on List Library
    Web->>API: GET /sharelists
    API->>Auth: auth.getUser(token)
    API->>DB: owned sharelists + collaborator rows + sharelist_links
    DB-->>API: lists (often empty)
    API-->>Web: []

    User->>Web: Open Settings or New ShareList
    Web->>API: GET /streaming/connected
    API->>DB: SELECT connected_services
    DB-->>API: none connected
    API-->>Web: []

    Note over User,Platform: Connect Spotify, Apple Music, or SoundCloud (see flow 3)
    User->>Web: Create ShareList
    Web->>API: GET /streaming/connected
    API->>DB: SELECT connected_services
    DB-->>API: provider row
    API-->>Web: [{ provider }]

    User->>Web: Pick Spotify or Apple Music
    Web->>API: GET /streaming/{provider}/playlists
    API->>DB: Read access_token from connected_services
    API->>Platform: List the user's playlists
    Platform-->>API: Playlist catalog
    API-->>Web: [{ id, name, imageUrl, externalUrl }]

    User->>Web: Pick a playlist, name the ShareList, optionally add friend emails
    Web->>API: POST /sharelists { provider, playlistId, playlistName, name }
    API->>DB: INSERT sharelists (owner_id, name)
    API->>DB: INSERT sharelist_links (primary playlist)
    DB-->>API: new ShareList id
    API-->>Web: 201 ShareList summary
    opt Friend emails queued
        loop Each queued email
            Web->>API: POST /friends/invites { email, sharelistId }
        end
    end
    Web->>Web: Navigate to /list/:id

    Web->>API: GET /sharelists/:id
    API->>DB: sharelists + sharelist_links + members
    API->>Platform: GET playlist tracks for each link
    Platform-->>API: Track lists
    API-->>Web: ShareList detail (links, tracks, members)
    Web-->>User: ShareList view
```

### 3. Link a music platform

Tokens are stored in `connected_services` (Supabase Postgres), not in the browser. Spotify is a redirect OAuth code flow. Apple Music is MusicKit JS in the page: the API mints a developer JWT, the browser asks Apple for a Music User Token, then POSTs that token back.

#### Spotify

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as ShareList Web<br/>(React)
    participant API as ShareList API<br/>(Express)
    participant Auth as Supabase Auth
    participant DB as Supabase Postgres
    participant SpAuth as Spotify Accounts
    participant SpAPI as Spotify Web API

    User->>Web: Connect Spotify (Settings)
    Web->>API: GET /streaming/spotify/auth-url
    API->>Auth: auth.getUser(token)
    API->>API: HMAC-sign OAuth state (userId, returnOrigin, redirectUri)
    API-->>Web: { url: accounts.spotify.com/authorize?... }
    Web->>SpAuth: Redirect browser to authorize URL
    User->>SpAuth: Approve playlist-read and playlist-modify scopes
    SpAuth->>API: GET /streaming/spotify/callback?code&state
    API->>API: verifyState(state)
    API->>SpAuth: POST /api/token (authorization_code + client secret)
    SpAuth-->>API: access_token, refresh_token, expires_in
    API->>SpAPI: GET /v1/me
    SpAPI-->>API: Spotify user id
    API->>DB: UPSERT connected_services (spotify tokens + provider_user_id)
    API->>Web: Redirect /settings/streaming?connected=spotify
    Web-->>User: Spotify connected
```

#### Apple Music

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as ShareList Web<br/>(React)
    participant API as ShareList API<br/>(Express)
    participant Auth as Supabase Auth
    participant DB as Supabase Postgres
    participant MK as MusicKit JS<br/>(Apple CDN)
    participant Apple as Apple Music API

    User->>Web: Connect Apple Music (Settings)
    Web->>API: GET /streaming/apple_music/auth-url
    API->>Auth: auth.getUser(token)
    API->>API: Sign ES256 developer JWT (Team ID + Key ID + .p8)
    API->>API: HMAC-sign state (userId)
    API-->>Web: { url: apple-music://authorize, state, developerToken }

    Web->>MK: Load musickit.js from Apple CDN
    Web->>MK: MusicKit.configure({ developerToken }).authorize()
    User->>MK: Allow access to Apple Music library
    MK-->>Web: Music User Token

    Web->>API: POST /streaming/apple_music/callback { code: musicUserToken, state }
    API->>Auth: auth.getUser(token)
    API->>API: verifyState(state)
    API->>Apple: GET /v1/me (Bearer developer JWT + Music-User-Token)
    Apple-->>API: Apple Music user id
    API->>DB: UPSERT connected_services (Music User Token, no refresh/expiry)
    API-->>Web: { providerUserId }
    Web-->>User: Apple Music connected
```

### 4. Fetch platform data and link a playlist

Two product paths share the same fetch. Creating a ShareList writes the first (primary) link. Linking another playlist onto an existing ShareList also runs **Sync Lists** (`runCrossSync`) so missing tracks are copied into each linked playlist when a match exists on that service.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as ShareList Web<br/>(React)
    participant API as ShareList API<br/>(Express)
    participant Auth as Supabase Auth
    participant DB as Supabase Postgres
    participant Platform as Spotify Web API<br/>or Apple Music API

    User->>Web: New ShareList, or Manage List → Add To List
    Web->>API: GET /streaming/connected
    API->>Auth: auth.getUser(token)
    API->>DB: SELECT connected_services
    DB-->>API: connected providers
    API-->>Web: [{ provider }]

    User->>Web: Choose Spotify or Apple Music
    Web->>API: GET /streaming/{provider}/playlists
    API->>DB: Read stored tokens (refresh Spotify if near expiry)
    alt Spotify
        API->>Platform: GET /v1/me/playlists
    else Apple Music
        API->>Platform: GET /v1/me/library/playlists
    end
    Platform-->>API: Playlist catalog
    API-->>Web: [{ id, name, imageUrl, trackCount, externalUrl }]
    User->>Web: Select a playlist

    alt Create a new ShareList
        Web->>API: POST /sharelists { provider, playlistId, playlistName, name }
        API->>DB: INSERT sharelists
        API->>DB: INSERT sharelist_links (is_primary = true)
        API-->>Web: 201 ShareList
        Web->>Web: Open /list/:id
        Web->>API: GET /sharelists/:id
        API->>DB: Load links
        API->>Platform: GET playlist items/tracks for each link
        Platform-->>API: Tracks
        API-->>Web: Detail view (does not write back to the platform)
    else Link onto an existing ShareList
        Web->>API: POST /sharelists/:id/links { provider, playlistId, playlistName }
        API->>DB: INSERT sharelist_links (is_primary = false)
        API->>API: runCrossSync (Sync Lists)
        loop Each linked playlist on the same provider
            API->>Platform: GET current tracks
            Platform-->>API: Track list
            API->>DB: Diff against other links + sharelist_sync_log
            API->>Platform: Add missing tracks to this playlist
            API->>DB: INSERT sharelist_sync_log
        end
        API-->>Web: 201 { linked: true }
    end
```

**Fetch Songs** (`POST /sharelists/:id/sync`) is a later refresh of the same read path: it re-fetches playlist name, artwork, and tracks from the platform, writes metadata back to `sharelist_links`, and updates the ShareList view. It does not add songs on Spotify or Apple Music. **Sync Lists** (`POST /sharelists/:id/cross-sync`) is the write path that copies missing tracks into each linked playlist.

### 5. Share lists with other users

Sharing is per ShareList, not a separate friends graph. Two people become “friends” when they both have a `sharelist_collaborators` row. Email invites go through Resend and must be accepted. Toggling a list on for an already-linked friend grants access immediately.

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    actor Friend
    participant Web as ShareList Web<br/>(React)
    participant API as ShareList API<br/>(Express)
    participant Auth as Supabase Auth
    participant DB as Supabase Postgres
    participant Resend as Resend

    Owner->>Web: Open Friends

    alt Email invite (Add Friend)
        Owner->>Web: Email + ShareList
        Web->>API: POST /friends/invites { email, sharelistId }
        API->>Auth: auth.getUser(token)
        API->>DB: Confirm owner owns the ShareList
        API->>DB: INSERT sharelist_invites (status=pending, token, expires_at)
        API->>Resend: POST https://api.resend.com/emails
        Resend-->>Friend: Invite email with /invite/:token
        API-->>Web: 201 { sent: true }

        alt Friend is signed in (Pending Requests)
            Friend->>Web: Friends → Pending Requests
            Web->>API: GET /friends
            API->>DB: pending sharelist_invites for friend email
            API-->>Web: incoming requests
            Friend->>Web: Accept
            Web->>API: POST /friends/requests/:inviteId/accept
        else Friend uses the email link
            Friend->>Web: Open /invite/:token
            Web->>API: GET /friends/invites/:token
            API->>DB: Lookup invite + sharelist name
            API-->>Web: inviter, list name, invitee email
            Note over Friend,Web: Sign up or sign in if needed
            Web->>API: POST /friends/invites/:token/accept
        end

        API->>DB: UPSERT sharelist_collaborators
        API->>DB: UPDATE sharelist_invites SET status=accepted
        API-->>Web: { accepted: true, sharelistId }
        Friend->>Web: List Library → Lists you've been invited to
        Web->>API: GET /sharelists
        API->>DB: lists where user is owner or collaborator
        API-->>Web: shared list (isShared=true)
    else Already linked friend (My Friends toggle)
        Owner->>Web: Toggle a ShareList on for an Active friend
        Web->>API: POST /friends/share { sharelistId, userId }
        API->>Auth: auth.getUser(token)
        API->>DB: UPSERT sharelist_collaborators
        API-->>Web: { shared: true }
        Note over Friend,DB: No invite row. No accept step. Access is immediate.
        Friend->>Web: Refresh List Library
        Web->>API: GET /sharelists
        API->>DB: collaborator membership
        API-->>Web: newly shared list
    end
```

Rejecting a pending request is `POST /friends/requests/:inviteId/reject` (`sharelist_invites.status = rejected`). Unsharing an already-linked list is `POST /friends/unshare`, which deletes that user's `sharelist_collaborators` row for that ShareList only.
