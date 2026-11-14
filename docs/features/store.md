# Store (Tienda)

> Responsibility: the Store tab — gem-priced catalog and the real-money gem packs bought through Mercado Pago.
> Update when: a store tab, purchase flow, gem pack, gift flow, or its backing endpoint changes.
> Sources: src/screens/tabs/StoreTabScreen.tsx, src/features/store/ (incl. screens/GemShopScreen.tsx), src/api/shop.ts, src/api/gemOrders.ts, src/api/courseOrders.ts, app.json
>
> Note: the same Mercado Pago pattern (`useGemPurchase`) is reused by `useCoursePurchase` to buy
> permanent access to paid courses (`/store/course-orders`), surfaced in the Home course selector
> and Profile → Cursos, and also in this tab's **Cursos** section (`components/CoursesSection`:
> paid, not-owned courses, "no usan gemas"; each opens the course sheet). See [courses.md](./courses.md).

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
| Especiales | `MYSTERY_CHEST` | gems |

`GEMS`-typed catalog items no longer exist: the backend deactivated the ones that were priced in
gems. Gems only enter the economy through the signup bonus (100), the mystery chest and the packs.

## Gem-priced purchase (unchanged)

`openBuy(item)` → `confirm` sheet (or `insufficient` if `gems < priceGems`) → `shopApi.purchase(id)`
→ `success` overlay (the mystery chest passes through an `opening` step first). The `insufficient`
sheet's **"Conseguir gemas"** button calls `goToGemPacks(missing)`: closes the sheet and opens the
**gem shop** (`GemShop` route) with `missingGems` (pre-marks the smallest pack that covers it) and
`returnTo` (the item title: the credited screen then offers "Volver a <item>" instead of "Ir a
gastarlas"). The sheet itself shows a "Te alcanza con N gemas · $ X" card, from `gemOrdersApi.getPacks()`
loaded with the shop (`suggestedPack` in `features/store/gemPacks.ts`). The lesson's `NoLivesOverlay`
also shows the gems balance with a "+" that opens the gem shop (`returnTo: "la lección"`).
The Store header's GEMAS card carries the same "+" (and so does Inicio's). The tab refetches
`/inventories/me` on focus, so a purchase made in the gem shop shows up on return.

## Gem packs with real money (Mercado Pago Checkout Pro)

All platforms. Packs are bought in their own screen, `GemShopScreen`
(`src/features/store/screens/`, route `GemShop`, modal), separate from the Store tab where gems are
*spent*. Entry points: the "+" on the GEMAS stat of Inicio and Tienda, and "Conseguir gemas" in the
`insufficient` sheet. The screen owns the purchase through `useGemPurchase`
(`src/features/store/useGemPurchase.ts`); the price shown is the pack's `price` in ARS from the
backend (`$ 3.300`). Design: `Compra de gemas.dc.html` (Claude Design project "Flujo de compra de cursos").

Screens (all inside `GemShopScreen`, driven by the hook's `status`):

1. **Shop**: header + 2-column grid of packs (more gems → more diamonds in the art; "MÁS ELEGIDO" on
   `gems_pack_850`, "MEJOR PRECIO" on the last; "+N%" bonus computed client-side against the
   smallest pack's gems-per-peso). With `missingGems`, the smallest covering pack gets a ring. Below:
   "Gemas gratis" row (goes to Inicio, where the challenges live) and payment notes.
2. **Confirm sheet** (tap a pack): before/after balance, total, "Pagar con Mercado Pago". The order is
   created only here (`buy(pack)`).
3. **Checking** (`status: "checking"`): full-screen "Confirmando tu pago" instead of a spinner in the button.
4. **Credited**: blue full screen, "+N" and a count-up from the old to the new balance. "Ir a gastarlas"
   → Store tab, "Listo" → back. Either button first plays a ~0.9 s flight of diamonds (`DiamondFlight`) from the art up to the header's gems card, then navigates; the target height is `insets.top + 150`, an approximation of where the card sits in Inicio / Tienda.
   While an order is in process (also later, after leaving the checkout) `usePendingGemOrders` (`GET /store/gem-orders/pending`, refetched on focus) puts an orange dot on the GEMAS card of Inicio and Tienda and a "Pendiente" row above the packs.
5. **Pending** (`status: "pending"`): `pajaros.svg`, "Tu pago está en camino" + order card with a
   "Pendiente" chip.

Flow:

1. On mount: `gemOrdersApi.getPacks()`, sorted by `sortOrder`.
2. `buy(pack)` → `gemOrdersApi.createOrder(pack.id)` → `WebBrowser.openAuthSessionAsync(checkoutUrl,
   "signa://store")` (Custom Tab / in-app browser). Mercado Pago sends the buyer back to the API's
   public return endpoint, which answers with a 302 straight to `signa://store?pago=…` (no page is
   shown), closing the browser.
3. Whether the browser returned or the user closed it, the hook calls `gemOrdersApi.syncOrder(orderId)`
   (up to 4 times, 2.5 s apart, since approval can take seconds). The backend re-reads the order from
   Mercado Pago and credits the gems **exactly once** (it also credits from the webhook).
4. `status: "PAID"` → `onCredited(order)`: the screen shows the credited view with
   `order.inventory.gems` as the new balance.

Edge cases:

- **Payment still in process** (cash, bank transfer, review): after the attempts the hook sets
  `pending` and the pending screen says the gems arrive when Mercado Pago approves. The webhook credits
  them later; Home/Profile refetch `/inventories/me` on focus.
- **User abandons checkout**: `sync` returns `PENDING`, so the same pending screen shows; no gems move.
- **Crash / kill mid-payment**: nothing to recover client-side; the webhook credits the order.
- **Backend error** (pack without price 400, unknown pack 404, Mercado Pago down): error note in the
  confirm sheet from `err.response.data.message`.

Packs are seeded by the backend with their ARS price (`gems_pack_120` · `gems_pack_300` ·
`gems_pack_850` (featured "Más elegido") · `gems_pack_2000`); changing a price or adding a pack is a
backend change, no app release.

### Verified in production (2026-11-07)

Tested end to end with real money against `https://api.signasource.app`: a 120-gem pack was bought
from the app, the checkout opened in the in-app browser, the gems were credited **once** (one `PAID`
order, no double credit) and, after refunding the payment from Mercado Pago, the webhook moved the
order to `REFUNDED` and took the 120 gems back (the balance never goes below 0).

Verified: pack list with ARS prices · order creation · checkout · return to the app · credit ·
webhook signature (`x-signature`) and delivery (200) · unknown-order notification acknowledged with
200 · refund reversal.

Not verified yet: the `pending` path (a payment that stays in process, e.g. cash) and abandoning the
checkout, plus iOS (the flow is platform-independent but only Android was run).

Pitfalls found while setting it up:

- `MERCADO_PAGO_ACCESS_TOKEN` must be the **Access Token** (`APP_USR-…`) of the production
  credentials, not the Public Key. With the Public Key every call answers `403
  PA_UNAUTHORIZED_RESULT_FROM_POLICIES`, which looks like a blocked account but is not. Check it with
  `GET https://api.mercadopago.com/users/me` (must be 200).
- `external_reference` only admits letters, digits, `-` and `_` (max 64). Gem orders use `gems_<id>`;
  `gems:<id>` was rejected with `400 … does not match pattern`.
- The panel's "Simular notificación" sends a made-up order id; the API acknowledges it with 200.
- Each Mercado Pago application has its own webhook secret: if the application changes, update
  `MERCADO_PAGO_WEBHOOK_SECRET` too.
- The app needs `EXPO_PUBLIC_API_URL=https://api.signasource.app` in its `.env` (restart Metro with
  `npx expo start -c` after changing it).

### Native requirements

- `expo-web-browser` (config plugin in `app.json`) and `scheme: "signa"`, both native: rebuild the dev
  client (`npx expo run:android` / EAS `development` build) after pulling this change. Expo Go does not
  register the `signa://` scheme.
- The backend needs `MERCADO_PAGO_ACCESS_TOKEN`, the `order` webhook registered in the Mercado Pago
  panel (`POST /payments/mercado-pago/webhook`) with `MERCADO_PAGO_WEBHOOK_SECRET`, and a public
  https `BASE_URL`; see `signa-api`'s `CLAUDE.md`.

## Gifting

Every card in the catalog has a **"Regalar a un amigo"** link under *Comprar*. It opens `GiftSheet`
(`src/features/store/components/GiftSheet.tsx`): friend list from `socialApi.getFriends()`, an
optional message (max 500) once a friend is picked, and **"Regalar a @user"** →
`shopApi.sendGift(itemId, friendId, message)`. On success the sheet closes and the screen opens
`GiftDoneOverlay` (full-screen amber, `mano-con-globo.svg`, "¡Regalo enviado!") and refetches
`/inventories/me` (the endpoint returns no inventory) to show the debited gems. With no friends
the sheet shows `mano-vacia.svg` instead of a list.

- Not enough gems → the same `insufficient` sheet as buying ("Conseguir gemas").
- The backend rejects non-friends and self-gifts; its message is shown inline in the sheet.
- Gem-priced catalog items only; gem packs (real money) can't be gifted.
- The friend-accepted modal's "send gift" button just navigates to this tab.

## Purchase history and refund requests

`PurchaseHistoryScreen` (`src/features/store/screens/`), route `PurchaseHistory`, shows all gem
and course orders merged and sorted newest-first. Each card shows the icon, product name, date,
amount, and a status badge (`PENDING` / `PAID` / `REFUNDED`).

**"Pedir reembolso"** appears on `PAID` orders where `refundedAt == null` and no refund request has
already been submitted this session. It opens `RefundRequestSheet`
(`src/features/store/components/`), a bottom sheet modal with:

- Product row (icon + name).
- **Motivo**: chip grid of 6 reasons (`MISTAKE · DUPLICATE · NOT_RECEIVED · NOT_AS_EXPECTED · TECHNICAL · OTHER`).
- **Comentario**: free-text area (10–2000 chars).
- **"Enviar pedido"** → `gemOrdersApi.createRefundRequest` or `courseOrdersApi.createRefundRequest` (depending on order kind). On success: success state with a checkmark; the parent screen marks the order as "Pedido de reembolso enviado" for the session.

A refund request does **not** refund automatically — it enters the admin queue for review. The
backend enforces eligibility at submit time (not just client-side): rejects if the order is not
`PAID`, already refunded, the user spent part of the gems (gem orders), or the user completed the
first lesson (course orders). A second request on the same order is also rejected (409 equiv → 400).

The sheet uses `KeyboardAvoidingView` so the TextInput stays visible when the soft keyboard is open,
and `Math.max(insets.bottom, 28)` for the bottom padding so buttons clear virtual navigation bars.

### Receiving gifts

`ReceivedGiftsSection` (`src/features/store/components/`) sits at the top of every tab as
**"Regalos para vos"**. On each focus it loads `shopApi.getReceivedGifts("PENDING")` (and keeps only
`status === "PENDING"`, since the server filters on the stored status and a stale one can come back
`EXPIRED`). Each card shows the item (`mano-con-caja.svg`), `@sender`, days left and the message;
**"Reclamar"** → `shopApi.claimGift(id)`. On success the screen sets `inventory = result.inventory`
and opens `GiftDoneOverlay` (`mano-con-caja.svg`, "¡Regalo reclamado!", the resolved effect via
`effectLabel`). The block renders nothing while loading, on load errors, or when there are no
pending gifts. A 400 (expired) / 409 (already claimed) on claim shows the backend message and drops
the card. Sent gifts (`GET /store/gifts/sent`) still have no client or UI.
