# Auth context

> Responsibility: `useAuth()` contract and session lifecycle.
> Update when: the session flow or the `useAuth` API changes.
> Sources: src/context/AuthContext.tsx

Single global state. Consumed via `useAuth()` (throws if used outside `<AuthProvider>`, mounted in `App.tsx`).

## `AuthContextValue`

| Field | Type | Description |
|---|---|---|
| `user` | `User \| null` | `{ email, name? }`; `name` is best-effort local cache |
| `isLoading` | `boolean` | `true` while the session hydrates at startup |
| `isAuthenticated` | `boolean` | `!!user` — consumed by `RootNavigator` |
| `error` | `string \| null` | last auth-operation error |
| `login(LoginRequest)` | `Promise<void>` | logs in, stores tokens, builds `user` |
| `register(RegisterRequest)` | `Promise<void>` | registers, stores tokens, caches the name and builds `user` — **auto-logs in** |
| `changePassword(ChangePasswordRequest)` | `Promise<void>` | changes password and **rotates tokens** |
| `logout()` | `Promise<void>` | clears tokens and `user` |

## Behavior

- `buildUserFromToken` builds `user` by decoding the email from the JWT + looking up the name in `profileCache`. The JWT carries no name (see [../api/session-persistence.md](../api/session-persistence.md)).
- `restoreSession` runs once on mount: no tokens → stop; expired access token → try `refresh`; any failure → clear tokens (anonymous session). Sets `isLoading=false` at the end.
- **AppState listener**: on mount, `AuthProvider` subscribes to `AppState`. When the app returns from background/inactive to `active`, `checkSession` runs: if the access token is expired it attempts a refresh; if the refresh fails it clears tokens and sets `user = null`.
- **Interceptor ↔ context bridge**: `setOnRefreshFailure` (from `src/api/client.ts`) is called on mount with a callback that sets `user = null`. This ensures that when the Axios 401 interceptor exhausts the refresh token, the user is sent back to the auth stack without needing to navigate manually.
- Operations set `error` with `err?.response?.data?.message ?? "<fallback>"` **and re-throw**, so the screen can also react in its `catch`.
- Switching auth↔app is **not** manual navigation: mutating `user` makes `RootNavigator` swap stacks (see [../navigation.md](../navigation.md)).
- Async operations follow the standard loading/error pattern in [`CLAUDE.md`](../../CLAUDE.md).
