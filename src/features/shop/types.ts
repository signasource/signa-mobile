/**
 * Tipos espejados 1:1 desde signa-api (paquete gamification).
 * Fuente: ShopItemController, InventoryController, PurchaseController,
 * GiftController y sus DTOs/entities en signa-api.
 */

// ShopItemType.java
export type ShopItemType =
  | "STREAK_SHIELD"
  | "LIFE"
  | "XP_MULTIPLIER"
  | "UNLIMITED_LIVES"
  | "MYSTERY_CHEST"
  | "GEMS";

// LivesMode.java
export type LivesMode = "INFINITE" | "LIMITED";

// GiftStatus.java
export type GiftStatus = "PENDING" | "CLAIMED" | "EXPIRED";

// UserStats.MAX_LIVES en signa-api (gamification/entity/UserStats.java)
export const MAX_LIVES = 5;

// ShopItemResponse.java
export interface ShopItemResponse {
  id: string;
  code: string;
  title: string;
  description: string;
  itemType: ShopItemType;
  priceGems: number;
  quantity: number;
  durationMinutes: number | null;
  multiplierValue: number | null;
  active: boolean;
}

// UserInventoryResponse.java
export interface UserInventoryResponse {
  gems: number;
  streakShields: number;
  livesMode: LivesMode;
  currentLives: number | null;
  nextLifeAt: string | null;
  effectiveXpMultiplier: number;
  xpMultiplierExpiresAt: string | null;
  xpMultiplierActive: boolean;
  unlimitedLivesExpiresAt: string | null;
  unlimitedLivesActive: boolean;
}

// AppliedEffectResponse.java
export interface AppliedEffectResponse {
  type: ShopItemType;
  gemsGranted: number | null;
  livesGranted: number | null;
  streakShieldsGranted: number | null;
  xpMultiplierValue: number | null;
  durationMinutes: number | null;
}

// PurchaseRequest.java
export interface PurchaseRequest {
  shopItemId: string;
}

// PurchaseResponse.java
export interface PurchaseResponse {
  id: string;
  item: ShopItemResponse;
  gemsSpent: number;
  purchasedAt: string;
  effect: AppliedEffectResponse;
  inventory: UserInventoryResponse;
}

// SendGiftRequest.java
export interface SendGiftRequest {
  shopItemId: string;
  recipientUserId: string;
  message?: string;
}

// GiftResponse.java
export interface GiftResponse {
  id: string;
  item: ShopItemResponse;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  message: string | null;
  status: GiftStatus;
  sentAt: string;
  claimedAt: string | null;
  expiresAt: string | null;
}

// GiftClaimResponse.java
export interface GiftClaimResponse {
  gift: GiftResponse;
  effect: AppliedEffectResponse;
  inventory: UserInventoryResponse;
}

/**
 * STUB: signa-api todavia no expone un endpoint para listar amigos ni para
 * buscar usuarios por username (FriendshipController solo tiene
 * request/accept). Hasta que exista, el selector de "regalar a un amigo"
 * usa esta lista fija en vez de datos reales. Cuando el back agregue el
 * endpoint, reemplazar por una llamada real y borrar este tipo.
 */
export interface StubFriend {
  userId: string;
  username: string;
  name: string;
}
