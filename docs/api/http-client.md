# HTTP client

> Responsibility: `apiClient` behavior and environment configuration.
> Update when: `client.ts` interceptors, refresh logic, casing, base URL, or env change.
> Sources: src/api/client.ts, src/utils/caseConverter.ts, .env.example, .env.production, eas.json, app.json

All communication with `signa-api` (Spring Boot) goes through `src/api/`. **Never call `axios` directly from a screen** — use the endpoint modules ([endpoints.md](./endpoints.md)); the central client resolves token, casing, and refresh.

## `apiClient` (`src/api/client.ts`)

Axios instance:
- **`baseURL`** = `process.env.EXPO_PUBLIC_API_URL` (fallback `http://localhost:8080`). Base is **direct, without `/api`** (backend defines no context-path). Also exported as `API_URL`.
- **`timeout`** 10s, `Content-Type: application/json`.
- **Request interceptor:**
  - Attaches `Authorization: Bearer <accessToken>` when a token exists in `tokenStorage`.
  - Converts the body to **snake_case** (`keysToSnakeCase`).
- **Response interceptor:** feeds the `Date` header to `syncServerClock` (see [session-persistence.md](./session-persistence.md)) and converts data to **camelCase** (`keysToCamelCase`). 4xx/5xx the client doesn't transparently retry are reported with `trackApiError(status)` (telemetry, fire-and-forget).
- **Automatic 401/403 refresh:** on 401 **or 403** (the backend returns 403 instead of 401 for some expired/invalid-token cases) from a non-`/auth/*` endpoint, calls `refreshSession()` and **retries** the original request once (`_retry` prevents loops). `/auth/*` endpoints are skipped (their 401/403 mean bad credentials, not an expired token).
- **`refreshSession()`** — exported, **single-flight** (the only place that calls `POST /auth/refresh`): interceptor, app-foreground check and startup restore share one in-flight request, so a rotated refresh token is never used twice. Resolves with the new access token; rejects with **`SessionRejectedError`** only when the server answers 400/401/403 (or no refresh token exists). Network errors, timeouts and 5xx are **transient**: tokens are kept, the original error reaches the screen, and the session stays open (like Instagram/Duolingo). Only `SessionRejectedError` clears tokens and calls `onRefreshFailure` (and only if there was a session).
- **`setOnRefreshFailure(cb)`** — exported function; `AuthContext` calls this on mount to wire the "forced logout" path.

**Invariant:** screen code always works in **camelCase**; snake_case conversion is transparent (`src/utils/caseConverter.ts`).

## Environment (`.env`)

- `EXPO_PUBLIC_API_URL` — base URL **without `/api`**.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — Google OAuth client ID type "Web application"; must equal `GOOGLE_CLIENT_ID` in signa-api (it is the `idToken` audience). Read by `src/utils/googleAuth.ts`.
  - Production/default: `https://api.signasource.app` (HTTPS via Cloudflare). Set in `.env.production` (release builds) and `eas.json` (`preview`/`production` profiles).
  - Cleartext HTTP is **disabled** on Android (no `usesCleartextTraffic` in `app.json`), so release builds (EAS `preview`/`production`) can only reach `https://` URLs. Debug builds (`npx expo run:android`, EAS `development`) still allow cleartext via the prebuild template's `src/debug/AndroidManifest.xml`, so local `http://` backends keep working there.
  - Local dev per platform: Android emulator → `http://10.0.2.2:8080` (not `localhost`); iOS simulator → `http://localhost:8080`; physical device → local PC IP (e.g. `http://192.168.0.10:8080`).
- Optional build-time switches (all `EXPO_PUBLIC_*`, none required):
  - `EXPO_PUBLIC_GLB_BASE` — alternative origin for the `.glb` avatars ([../avatar-3d.md](../avatar-3d.md)).
  - `EXPO_PUBLIC_AVATAR_WEBVIEW=1` — force the WebView avatar even where Filament is available.
  - `EXPO_PUBLIC_BANCO_NATIVO=1` — show the recogniser bench before the app (`App.tsx`).
  - `EXPO_PUBLIC_METRICS_URL` / `EXPO_PUBLIC_BUILD` — diagnostic metrics collector and build label ([../rendimiento.md](../rendimiento.md)).
- `.env` is gitignored; copy from `.env.example`. `EXPO_PUBLIC_*` vars are embedded in the bundle at build time.
