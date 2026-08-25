# HTTP client

> Responsibility: `apiClient` behavior and environment configuration.
> Update when: `client.ts` interceptors, refresh logic, casing, base URL, or env change.
> Sources: src/api/client.ts, src/utils/caseConverter.ts, .env.example

All communication with `signa-api` (Spring Boot) goes through `src/api/`. **Never call `axios` directly from a screen** — use the endpoint modules ([endpoints.md](./endpoints.md)); the central client resolves token, casing, and refresh.

## `apiClient` (`src/api/client.ts`)

Axios instance:
- **`baseURL`** = `process.env.EXPO_PUBLIC_API_URL` (fallback `http://localhost:8080`). Base is **direct, without `/api`** (backend defines no context-path). Also exported as `API_URL`.
- **`timeout`** 10s, `Content-Type: application/json`.
- **Request interceptor:**
  - Attaches `Authorization: Bearer <accessToken>` when a token exists in `tokenStorage`.
  - Converts the body to **snake_case** (`keysToSnakeCase`).
- **Response interceptor:** converts data to **camelCase** (`keysToCamelCase`).
- **Automatic 401 refresh:** on 401, calls `POST /auth/refresh` with the refresh token, stores the new tokens, and **retries** the original request (`_retry` prevents loops). A queue (`pendingQueue`) makes concurrent requests wait for a single refresh. If refresh fails, clears tokens (`tokenStorage.clear()`) and rejects.

**Invariant:** screen code always works in **camelCase**; snake_case conversion is transparent (`src/utils/caseConverter.ts`).

## Environment (`.env`)

- `EXPO_PUBLIC_API_URL` — base URL **without `/api`**.
  - Production/default: `http://161.35.105.45` (port 80, behind a proxy).
  - Local dev per platform: Android emulator → `http://10.0.2.2:8080` (not `localhost`); iOS simulator → `http://localhost:8080`; physical device → local PC IP (e.g. `http://192.168.0.10:8080`).
- `.env` is gitignored; copy from `.env.example`. `EXPO_PUBLIC_*` vars are embedded in the bundle at build time.
