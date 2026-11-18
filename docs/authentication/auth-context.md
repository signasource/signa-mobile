# Auth context

> Responsibility: `useAuth()` contract and session lifecycle.
> Update when: the session flow or the `useAuth` API changes.
> Sources: src/context/AuthContext.tsx

Single global state. Consumed via `useAuth()` (throws if used outside `<AuthProvider>`, mounted in `App.tsx`).

## `AuthContextValue`

| Field | Type | Description |
|---|---|---|
| `user` | `User \| null` | `{ email, name?, role? }`; `name` is best-effort local cache, `role` (`USER` \| `ADMIN` \| `ORG_ADMIN`) is the JWT `role` claim — `RootNavigator` shows `RoleBlockedScreen` for anything but `USER` |
| `isLoading` | `boolean` | `true` while the session hydrates at startup |
| `isAuthenticated` | `boolean` | `!!user` — consumed by `RootNavigator` |
| `error` | `string \| null` | last auth-operation error |
| `sessionExpired` | `boolean` | true when the session closed itself (inactivity / failed refresh), as opposed to a manual `logout()` |
| `authInitialRoute` | `"Login" \| "Welcome"` | initial route `RootNavigator` gives `AuthNavigator`: `"Login"` after `resumeExpiredSession()`, `"Welcome"` otherwise |
| `login(LoginRequest)` | `Promise<void>` | logs in, stores tokens, discards the onboarding daily goal (the account keeps its own), builds `user` |
| `register(RegisterRequest)` | `Promise<void>` | registers (sending the onboarding daily goal), stores tokens, caches the name and builds `user` — **auto-logs in** |
| `loginWithGoogle()` | `Promise<boolean>` | opens the Google account picker (`signInWithGoogle`), calls `POST /auth/google` (with the onboarding daily goal; applied only to new accounts), stores tokens, builds `user` (name from Google if not cached). Resolves `false` if the user cancelled; throws on failure. Same call for login and sign-up |
| `changePassword(ChangePasswordRequest)` | `Promise<void>` | changes password and **rotates tokens** |
| `logout(preLogout?)` | `Promise<void>` | optionally runs `preLogout` first (errors swallowed; Configuración passes `unregisterPushToken` so the backend drops the FCM token while the session is still valid), then clears tokens and `user` (manual logout) |
| `resumeExpiredSession()` | `void` | user tapped "Iniciar sesión" on the session-expired modal: clears `user`, sets `authInitialRoute = "Login"` |
| `dismissExpiredSession()` | `void` | user tapped "Salir" on the session-expired modal: clears `user`, sets `authInitialRoute = "Welcome"` |

## Behavior

- `buildUserFromToken` builds `user` by decoding the email and `role` from the JWT + looking up the name in `profileCache`. The JWT carries no name (see [../api/session-persistence.md](../api/session-persistence.md)).
- `restoreSession` runs once on mount: no tokens → stop; expired access token → `refreshSession()`; only `SessionRejectedError` (server rejected the refresh token) clears tokens. A transient failure (offline, timeout, 5xx) keeps the session: the user enters with the expired token and the interceptor refreshes on the first request. Sets `isLoading=false` at the end.
- **AppState listener**: on mount, `AuthProvider` subscribes to `AppState`. When the app returns from background/inactive to `active`, `checkSession` runs: if the access token is expired it calls `refreshSession()`; it calls `expireSession()` only on `SessionRejectedError` (never on network errors, which are common right after resuming).
- **Interceptor ↔ context bridge**: `setOnRefreshFailure` (from `src/api/client.ts`) is called on mount with a callback that calls `expireSession()`. This ensures that when the Axios 401/403 interceptor (see [../api/http-client.md](../api/http-client.md)) exhausts the refresh token, the session-expired modal shows up without needing to navigate manually.
- **`expireSession()` (internal)**: clears tokens and sets `sessionExpired = true`, but **keeps `user` set** — unlike `logout()`. This keeps `isAuthenticated` true so the current app screen stays mounted behind `SessionExpiredModal` (rendered by `RootNavigator`, see [../navigation.md](../navigation.md)) instead of the app instantly unmounting into the auth stack and flashing empty states (e.g. "No tenés amigos" in Social) mid-transition. The modal is dismissed by `resumeExpiredSession()` or `dismissExpiredSession()`, both of which finally clear `user`.
- **Code layout**: `buildUserFromToken` is module-level; `restoreSession`, `checkSession`, `handleAppStateChange` and `expireSession` live inside the mount effect (they're only used there); the exposed actions are `useCallback([])` (they only touch setters), so the memoized context `value` changes only when state does.
- Operations set `error` with `err?.response?.data?.message ?? "<fallback>"` **and re-throw**, so the screen can also react in its `catch`.
- Switching auth↔app is **not** manual navigation: mutating `user` makes `RootNavigator` swap stacks (see [../navigation.md](../navigation.md)).
- `login()` and `loginWithGoogle()` also mark onboarding as completed on the device (a returning user skips it); `register()` / `loginWithGoogle()` send the onboarding daily goal and every flow then discards it locally.
- Async operations follow the standard loading/error pattern in [`CLAUDE.md`](../../CLAUDE.md).
