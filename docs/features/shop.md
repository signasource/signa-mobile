# Shop feature

> Responsibility: shop/gamification module scope and state.
> Update when: shop screens/types change, or the friends/gift backend gap is closed.
> Sources: src/features/shop/

Status: **real** (backend-integrated) except the gift-recipient picker, which is a **stub**. Module under `src/features/shop/`.

- `screens/ShopScreen.tsx`: full screen — amber header with gems/lives/shields stat pills, tab chips (Vidas / Potenciadores / Especiales), item list, purchase flow.
- `types.ts`: DTOs mirrored 1:1 from `signa-api`'s `gamification` package (`ShopItemResponse`, `UserInventoryResponse`, `PurchaseRequest/Response`, `SendGiftRequest`, `GiftResponse`, `GiftClaimResponse`, `AppliedEffectResponse`) plus the enums `ShopItemType`, `LivesMode`, `GiftStatus`. `MAX_LIVES = 5` mirrors `UserStats.MAX_LIVES` (not sent by the API).
- `api.ts`: `shopApi` — real endpoints, see [../api/endpoints.md](../api/endpoints.md).
- `catalogMeta.ts`: **client-only presentation layer**. The backend has no concept of icon/color/tab per item — this file maps `ShopItemType` → tab (`vidas`/`potenciadores`/`especiales`), Ionicons name, and semantic tone (`danger`/`warning`/`success`/`amber`), plus human-readable item/reward descriptions (`describeItem`, `rewardMeta`). If a new `ShopItemType` is added on the backend, add it here too or the shop screen throws on an unmapped type.
- `components/`: `StatPill` (header stat), `ShopItemCard` (catalog card, "featured" style for `UNLIMITED_LIVES`), `PurchaseFlowModal` (single component covering all purchase steps — `confirm → friend | insufficient`, and `chest → success` for the mystery chest reveal).
- `stubFriends.ts` / `StubFriend` (in `types.ts`): **STUB**. `signa-api`'s `FriendshipController` only has `POST /friendships/request/{id}` and `PATCH /friendships/accept/{id}` — there is no endpoint to list a user's friends or search users by username/id. The "regalar a un amigo" picker therefore shows a fixed local list of fake friends with fake UUIDs; gifting to one of them will fail against a real backend (`recipientUserId` won't resolve). Replace `stubFriends.ts` with a real friends/user-search API call once the backend exposes one, and delete `StubFriend`.

## Purchase flow

`ShopScreen` holds a single `flow: FlowState | null` (defined in `PurchaseFlowModal.tsx`) driving one modal:

1. Tap "Comprar" → `openBuy`: if `gems < item.priceGems` go straight to `insufficient`, else `confirm`.
2. `confirm` → "Comprar para mí" calls `shopApi.purchase`; the response's `inventory` field is applied directly (no extra fetch) → `success`. For `MYSTERY_CHEST` items, an `chest` step (spin/reveal animation, `Animated` API — no reanimated in the project) is shown for at least ~1.9s while the purchase call resolves in parallel, then `success` shows the resolved `effect` (server decides the chest reward, mirrored client-side by `rewardMeta`).
3. `confirm` → "Regalar a un amigo" → `friend` (stub picker) → `shopApi.sendGift`, then a follow-up `shopApi.getInventory()` (the gift endpoint doesn't return updated inventory) → `success`.
4. Any purchase/gift failure closes the modal and shows `Alert.alert` with the backend message.

## To advance

- Add a real friends-list or user-search endpoint on `signa-api` and swap `stubFriends.ts` for it.
- Consider surfacing `nextLifeAt` (life regen countdown) and `xpMultiplierExpiresAt`/`unlimitedLivesExpiresAt` (active-buff banners) elsewhere in the app (Home?) since `UserInventoryResponse` already carries them.
