# API types

> Responsibility: DTOs mirrored 1:1 from `signa-api` records.
> Update when: a backend DTO changes or a request/response type is added.
> Sources: src/types/index.ts, src/features/shop/types.ts

- `AuthResponse { accessToken, refreshToken }` — **carries no user data**.
- `LoginRequest { identifier, password }` — `identifier` is email or username.
- `RegisterRequest { email, username, password, name }`.
- `ForgotPasswordRequest { email }`.
- `ResetPasswordRequest { newPassword }` — token passed separately (see [endpoints.md](./endpoints.md)).
- `ChangePasswordRequest { currentPassword, newPassword }`.
- `ResendVerificationEmailRequest { email }`.
- `ApiErrorResponse { message, status, timestamp }` — backend error shape; UI error messages come from `err?.response?.data?.message`.
- `User { email, name? }` — `name` is best-effort local cache (see [session-persistence.md](./session-persistence.md)).

## Shop (`src/features/shop/types.ts`) — mirrors `signa-api`'s `gamification` package

- `ShopItemType = STREAK_SHIELD | LIFE | XP_MULTIPLIER | UNLIMITED_LIVES | MYSTERY_CHEST | GEMS`, `LivesMode = INFINITE | LIMITED`, `GiftStatus = PENDING | CLAIMED | EXPIRED`.
- `ShopItemResponse { id, code, title, description, itemType, priceGems, quantity, durationMinutes, multiplierValue, active }`.
- `UserInventoryResponse { gems, streakShields, livesMode, currentLives, nextLifeAt, effectiveXpMultiplier, xpMultiplierExpiresAt, xpMultiplierActive, unlimitedLivesExpiresAt, unlimitedLivesActive }`.
- `AppliedEffectResponse { type, gemsGranted, livesGranted, streakShieldsGranted, xpMultiplierValue, durationMinutes }` — nullable fields depend on `type`; used to render the mystery-chest reveal.
- `PurchaseRequest { shopItemId }`, `PurchaseResponse { id, item, gemsSpent, purchasedAt, effect, inventory }`.
- `SendGiftRequest { shopItemId, recipientUserId, message? }`, `GiftResponse { id, item, senderId, senderUsername, recipientId, recipientUsername, message, status, sentAt, claimedAt, expiresAt }`, `GiftClaimResponse { gift, effect, inventory }`.
- `MAX_LIVES = 5` — client-side constant mirroring `UserStats.MAX_LIVES` in `signa-api` (not part of any DTO).
- `StubFriend { userId, username, name }` — **not a backend type**, see [features/shop.md](../features/shop.md).
