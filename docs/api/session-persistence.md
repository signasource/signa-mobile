# Session persistence

> Responsibility: where tokens, identity, and profile name are stored and derived.
> Update when: token storage, JWT decoding, or profile-cache logic changes.
> Sources: src/utils/storage.ts, src/utils/jwt.ts, src/utils/profileCache.ts, src/utils/headerColorCache.ts

- **Tokens** → `src/utils/storage.ts` (`tokenStorage`) over **`expo-secure-store`** (Keychain/Keystore). Keys `signa_access_token`, `signa_refresh_token`.
- **JWT** → `src/utils/jwt.ts`: `extractEmailFromToken(token)` (claim `sub` = email), `isTokenExpired(token)`. The JWT carries **no** `role`, `id`, or `name`.
- **Name (best-effort)** → `src/utils/profileCache.ts` over **AsyncStorage** (non-sensitive, prefix `signa_name_cache:`). Saved at registration on this device; used for greeting/profile. Fallback: on another device the email is shown.
- **Profile header color** → `src/utils/headerColorCache.ts` over **AsyncStorage** (non-sensitive, key `signa_profile_header_color`). Local visual preference for `ProfileScreen`; signa-api has no such setting (`UserSettings` only carries `theme`). Default when unset: white.

**Known constraint:** the **session** identity (`useAuth().user`) still depends on JWT + local cache. The backend *does* expose `GET /users/me` (full profile incl. `username`) and `ProfileScreen` uses it, but `AuthContext` does not hydrate from it yet. See [endpoints.md](./endpoints.md) and [status.md](../status.md).
