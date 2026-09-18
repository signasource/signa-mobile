# Store (Tienda)

> Responsibility: the Store tab — gem-priced catalog and the real-money gem packs bought through Google Play.
> Update when: a store tab, purchase flow, gem pack, or its backing endpoint changes.
> Sources: src/screens/tabs/StoreTabScreen.tsx, src/features/store/, src/api/shop.ts, src/api/gemPurchases.ts, app.json

**Real**, wired end to end to `signa-api`. Endpoints → [../api/endpoints.md](../api/endpoints.md).
Types → [../api/types.md](../api/types.md).

## Layout (`StoreTabScreen`)

Header (`ScreenHeader`, amber tone) with the wallet: gems / lives / shields, all from
`shopApi.getMyInventory()`. Below it a `SegmentedControl` with three tabs; the flat catalog from
`shopApi.getItems()` is grouped client-side by `itemType`:

| Tab | Item types | Paid with |
|---|---|---|
| Vidas | `LIFE`, `UNLIMITED_LIVES` | gems |
| Potenciadores | `XP_MULTIPLIER`, `STREAK_SHIELD` | gems |
| Especiales | **gem packs** (top) + `MYSTERY_CHEST` | **real money** (packs) / gems (chest) |

`GEMS`-typed catalog items no longer exist: the backend deactivated the ones that were priced in
gems. Gems only enter the economy through the signup bonus (100), the mystery chest and the packs.

## Gem-priced purchase (unchanged)

`openBuy(item)` → `confirm` sheet (or `insufficient` if `gems < priceGems`) → `shopApi.purchase(id)`
→ `success` overlay (the mystery chest passes through an `opening` step first). The `insufficient`
sheet's **"Conseguir gemas"** button calls `goToGemPacks()`: closes the sheet, switches to the
*Especiales* tab and scrolls the list to the top, where the packs live.

## Gem packs with real money (Google Play Billing)

Android only. The `GemPacksSection` component (`src/features/store/components/`) is mounted only
when `Platform.OS === "android"`; elsewhere the tab shows an `EmptyNote` explaining that packs are
bought from the Android app. The section owns the whole Play connection through the
`useGemPurchase` hook (`src/features/store/useGemPurchase.ts`, built on `expo-iap`'s `useIAP`);
the screen only receives `onCredited(result)` and updates its inventory + shows
`GemsSuccessOverlay`.

Flow:

1. On connect: `gemPurchasesApi.getPacks()` → `fetchProducts({ skus, type: "in-app" })` →
   `getAvailablePurchases()`. Packs are paired with their Play product (`GemOffer`) and sorted by
   `sortOrder`; a pack whose product Play doesn't return is hidden. The price shown is Play's
   `displayPrice` (localized) — **the app never knows or sets prices**.
2. `buy(offer)` → `requestPurchase({ request: { google: { skus } }, type: "in-app" })` → Play sheet.
3. `onPurchaseSuccess(purchase)` → `gemPurchasesApi.redeem(productId, purchaseToken)`. The backend
   verifies the token with the Google Play Developer API and credits the gems **exactly once** per
   token. Only after that reply does the app call `finishTransaction({ purchase, isConsumable: true })`,
   which consumes the product so it can be bought again.
4. `onCredited(result)` → the screen sets `inventory = result.inventory` and opens
   `GemsSuccessOverlay` ("¡Sumaste N gemas!"; "ya estaban acreditadas" when `alreadyGranted`).

Edge cases:

- **Pending payment** (`purchaseState === "pending"`, e.g. cash at a kiosk): status `pending`, an
  inline note says the gems arrive when Google confirms. Nothing is sent to the backend.
- **User cancelled** (`ErrorCode.UserCancelled`): silent reset to `idle`.
- **Crash / kill between paying and crediting**: unconsumed purchases come back from
  `getAvailablePurchases()` on the next mount and go through the same redeem + finish path. The
  backend answers `alreadyGranted: true` if it had already credited, so nothing is double-counted.
  A `Set` of submitted tokens prevents the restore pass from re-sending a token in flight.
- **Backend rejects** (400 pending/cancelled, 404 unknown pack, 409 token used by another account or
  consumed without credit): inline error note from `err.response.data.message`; the purchase is
  **not** consumed, so it is retried on the next mount.
- Other tabs (Home, Profile) refetch `/inventories/me` on focus, so they pick up the new balance
  without any shared state.

Packs are seeded by the backend (`gems_pack_120` · `gems_pack_300` · `gems_pack_850` (featured
"Más elegido") · `gems_pack_2000`); adding one is a backend + Play Console change, no app release.

### Native requirements

- `expo-iap` (config plugin in `app.json`, adds `com.android.vending.BILLING`) + `expo-dev-client`.
  **Expo Go cannot run this screen's Android branch** — use `npx expo run:android` or an EAS
  `development` build.
- Play Billing only returns products for a package that exists in Play Console with the in-app
  products **created and active**, and only to a build signed like the uploaded one (internal
  testing track is enough). Test accounts go under *License testing*. Without that setup the
  section shows "no disponibles" (products list empty).
- The backend needs a Play service account (`GOOGLE_PLAY_CREDENTIALS_JSON`); see `signa-api`'s
  `CLAUDE.md` §4.

## Gifting

`POST /store/gifts` exists and friends are listable, but the Store has no gifting UI yet — see
[../status.md](../status.md).
