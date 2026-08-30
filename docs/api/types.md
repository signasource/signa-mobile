# API types

> Responsibility: DTOs mirrored 1:1 from `signa-api` records.
> Update when: a backend DTO changes or a request/response type is added.
> Sources: src/types/index.ts

- `AuthResponse { accessToken, refreshToken }` — **carries no user data**.
- `LoginRequest { identifier, password }` — `identifier` is email or username.
- `RegisterRequest { email, username, password, name, lastName }`.
- `ForgotPasswordRequest { email }`.
- `ResetPasswordRequest { newPassword }` — token passed separately (see [endpoints.md](./endpoints.md)).
- `ChangePasswordRequest { currentPassword, newPassword }`.
- `ApiErrorResponse { message, status, timestamp }` — backend error shape; UI error messages come from `err?.response?.data?.message`.
- `User { email, name? }` — `name` is best-effort local cache (see [session-persistence.md](./session-persistence.md)).
- `UserSettings { profileHeaderColor }` — subset of backend `UserSettings` exposed to the front-end; `profileHeaderColor` is a 6-digit hex string (e.g. `#7857FF`), default `#FFFFFF`.
- `ShopItem { id, code, title, description, itemType, priceGems, quantity, durationMinutes, multiplierValue, active }` — mirrors `ShopItemResponse`. `itemType` is `STREAK_SHIELD | LIFE | XP_MULTIPLIER | UNLIMITED_LIVES | MYSTERY_CHEST | GEMS`.
- `ShopInventory { gems, streakShields, livesMode, currentLives, nextLifeAt, effectiveXpMultiplier, xpMultiplierExpiresAt, xpMultiplierActive, unlimitedLivesExpiresAt, unlimitedLivesActive }` — mirrors `UserInventoryResponse`; `livesMode` is `INFINITE | LIMITED`. Distinct from `UserInventory` (`inventoryApi`), which only covers the fields the Profile screen reads.
- `AppliedEffect { type, gemsGranted, livesGranted, streakShieldsGranted, xpMultiplierValue, durationMinutes }` — mirrors `AppliedEffectResponse`; for a `MYSTERY_CHEST` purchase, `type` is the resolved reward, not the chest itself.
- `PurchaseResult { id, item, gemsSpent, purchasedAt, effect, inventory }` — mirrors `PurchaseResponse`.
