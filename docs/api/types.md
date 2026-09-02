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
- `LessonContent { id, name, description, order, blocks }` — mirrors `LessonDetailResponse`, from `features/courses/lessonContent.types.ts`.
- `LessonContentBlock { id, type, order, config, xpReward }` — mirrors `LessonBlockResponse`. `type` is `INFO | SELECT_MEANING | SELECT_SIGN | CONTEXT_RESPONSE | MATCH | VISUAL_RECOGNITION` (backend `BlockType`). `config` is a **raw JSON string** — it's the same JSON `ContentLoader` builds straight from the lesson's YAML (`signa-api/content/dto/yaml/LessonBlockDto.java`), so it keeps the YAML's own key casing instead of the API's usual snake_case, and the client interceptor never touches it (it's a string leaf, not a nested object). Parse it with `parseBlockConfig<T>(block)`.
- Per-type block configs (parsed from `config`, keys exactly as authored in the lesson `.yml`, see `signa-api/content/content/LSA/basic-course/topic-01.yml`):
  - `INFO`: `{ title, text, myths?: { title, myth, reality }[] }`. `text` is one or more `\n\n`-separated paragraphs; a paragraph wrapped in `*asterisks*` is a citation, rendered as a quote.
  - `SELECT_MEANING`: `{ sign, options: string[] }` — user is shown `sign`'s animation and picks its meaning from `options`.
  - `SELECT_SIGN`: `{ word, options: string[] }` — user is shown `word` and picks the matching sign animation from `options`.
  - `CONTEXT_RESPONSE`: `{ question, answer, options: string[] }` — same sign-carousel UI as `SELECT_SIGN`, but prompted by `question` with a single correct `answer`.
  - `MATCH`: `{ concepts: string[] }` — pairs a shuffled sign column with a shuffled word column, both listing the same `concepts`.
  - `VISUAL_RECOGNITION`: `{ sign_sequence: string[], options: string[], keep_order: boolean }` — user marks which of `options` appeared in `sign_sequence`. **Note:** the mobile app renders these keys as `sign_sequence`/`keep_order` because that's what's actually on the wire; `signa-api`'s own `BlockSignExtractor` reads them as `signSequence` (camelCase) and so never finds them — a pre-existing backend bug, out of scope here.
