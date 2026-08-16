# Spotify Web API — Development Rules

These rules apply to all code that interacts with the Spotify Web API in this project.
They are derived from Spotify's official AI-assisted coding best practices.

---

## 1. OpenAPI Specification

Always consult the Spotify OpenAPI specification for endpoint paths, parameters, and
response schemas before writing or modifying any Spotify API call:

> https://developer.spotify.com/reference/web-api/open-api-schema.yaml

Do **not** guess endpoint paths or field names. If a field's presence or type is
uncertain, verify against the spec.

---

## 2. Authorization Flow

- Use the **Authorization Code flow** (server-side, `apps/api`) since ShareList has a
  secure backend. Reference: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- Never use the **Implicit Grant** flow — it is deprecated by Spotify.
- Never use **Client Credentials** for user-specific data (playlists, library, etc.).
  Client Credentials is only for unauthenticated, public data.

---

## 3. Redirect URIs

- Use `http://127.0.0.1:<port>` for local development. **Never** use `http://localhost`
  — Spotify enforces loopback IP since April 2025.
- All production redirect URIs must use `https://`.
- Never use wildcard URIs.
- Reference: https://developer.spotify.com/documentation/web-api/concepts/redirect_uri

---

## 4. OAuth Scopes

- Request **only the minimum scopes** needed. Do not pre-request broad scopes.
- Current scopes used by this project:
  - `playlist-read-private` — read user's private playlists
  - `playlist-read-collaborative` — read collaborative playlists
- If a feature requires additional scopes, add them to the auth URL and document
  the reason here.
- Reference: https://developer.spotify.com/documentation/web-api/concepts/scopes
- Always use `show_dialog: 'true'` in the auth URL so users explicitly approve the
  current scope list. Never silently re-use a cached grant from an earlier auth flow.

---

## 5. Token Management

- Tokens are stored server-side in the `connected_services` Supabase table.
- Never expose the Client Secret in any client-side code or `VITE_*` env vars.
- The `refreshTokenIfNeeded` method in each provider handles proactive refresh
  5 minutes before expiry (`REFRESH_BUFFER_MS = 5 * 60 * 1000`).
- Reference: https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens

---

## 6. Rate Limits & Error Handling

- On **HTTP 429**: read the `Retry-After` header (seconds) and wait exactly that long
  before retrying. Use exponential backoff if `Retry-After` is absent.
- Never retry immediately on 429 or in a tight loop.
- On **HTTP 403**: the token is likely missing required scopes. Log the full error
  body and prompt the user to reconnect the service.
- Handle all documented error codes. Surface meaningful messages — do not swallow
  errors silently.

---

## 7. Endpoint Versioning — Use Current Endpoints

| **Use this (current)**                     | **Not this (deprecated)**           |
|--------------------------------------------|-------------------------------------|
| `GET /playlists/{id}/items`                | ~~`GET /playlists/{id}/tracks`~~    |
| `GET /me/library`                          | ~~type-specific library endpoints~~ |

The `/playlists/{id}/items` endpoint returns a `PlaylistItemObject` where the audio
content is in the **`item`** field (not the deprecated `track` field). Each `item` has
a `type` field (`"track"` or `"episode"`). Always filter by `item.type === 'track'`
to skip podcast episodes.

---

## 8. Response Field — `item` vs `track`

When reading items from `GET /playlists/{id}/items`:

```typescript
// ✅ Correct
const audioObj = playlistItem.item   // current field name

// ❌ Wrong — deprecated
const audioObj = playlistItem.track  // deprecated, may not be populated
```

Filter episodes:

```typescript
if (!audioObj || audioObj.type !== 'track') continue
```

---

## 9. Spotify Developer Terms

- Do **not** cache Spotify content beyond what is needed for immediate use.
  Track listings in ShareList are fetched live on every view / sync — do not
  persist them to the database.
- Always attribute content to Spotify in any user-facing display.
- Do **not** use the API to train machine learning models on Spotify data.
- Reference: https://developer.spotify.com/terms
