# Session persistence

> Responsibility: where tokens, identity, and profile name are stored and derived.
> Update when: token storage, JWT decoding, or profile-cache logic changes.
> Sources: src/utils/storage.ts, src/utils/jwt.ts, src/utils/profileCache.ts, src/utils/pendingReset.ts

- **Tokens** → `src/utils/storage.ts` (`tokenStorage`) over **`expo-secure-store`** (Keychain/Keystore). Keys `signa_access_token`, `signa_refresh_token`.
- **JWT** → `src/utils/jwt.ts`: `extractEmailFromToken(token)` (claim `sub` = email), `isTokenExpired(token)`. `extractRoleFromToken(token)` reads the optional `role` claim (`USER` / `ADMIN` / `ORG_ADMIN`; absent on tokens issued before the backend added it). The JWT carries no `id` or `name`.
- **Name (best-effort)** → `src/utils/profileCache.ts` over **AsyncStorage** (non-sensitive, prefix `signa_name_cache:`). Saved at registration on this device; used for greeting/profile. Fallback: on another device the email is shown.

- **Server clock** → `src/utils/serverClock.ts`: every response's `Date` header updates an in-memory offset (`syncServerClock`), and `serverNow()` returns server time; lives and booster countdowns use it so a wrong phone clock doesn't skew them. Not persisted.
- **Pending password reset** → `src/utils/pendingReset.ts` over **AsyncStorage** (key `signa_pending_password_reset`, `{ email, expiresAt }`, 15 min TTL like the backend code). Lets the auth stack reopen on `ResetPassword` after the app is killed while the user reads the code in their mail. See [../authentication/screens.md](../authentication/screens.md).

**Known constraint:** the session identity is the JWT email + role, and the name falls back to the local cache until the profile loads. `GET /users/me` (`usersApi.getMe()`) does exist and screens read the real profile from it. See [status.md](../status.md).
