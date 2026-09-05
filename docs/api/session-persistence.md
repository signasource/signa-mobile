# Session persistence

> Responsibility: where tokens, identity, and profile name are stored and derived.
> Update when: token storage, JWT decoding, or profile-cache logic changes.
> Sources: src/utils/storage.ts, src/utils/jwt.ts, src/utils/profileCache.ts

- **Tokens** → `src/utils/storage.ts` (`tokenStorage`) over **`expo-secure-store`** (Keychain/Keystore). Keys `signa_access_token`, `signa_refresh_token`.
- **JWT** → `src/utils/jwt.ts`: `extractEmailFromToken(token)` (claim `sub` = email), `isTokenExpired(token)`. The JWT carries **no** `role`, `id`, or `name`.
- **Name (best-effort)** → `src/utils/profileCache.ts` over **AsyncStorage** (non-sensitive, prefix `signa_name_cache:`). Saved at registration on this device; used for greeting/profile. Fallback: on another device the email is shown.

**Known constraint:** profile depends on JWT + local cache because the backend exposes no `GET /users/me`. See [status.md](../status.md).
