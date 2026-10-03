import { apiClient } from "./client";

export type ShopItemType =
  | "STREAK_SHIELD"
  | "LIFE"
  | "XP_MULTIPLIER"
  | "UNLIMITED_LIVES"
  | "MYSTERY_CHEST"
  | "GEMS";

export type LivesMode = "INFINITE" | "LIMITED";

export interface ShopItem {
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

export interface ShopInventory {
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
  learnedSignsCount: number;
}

export interface AppliedEffect {
  type: ShopItemType;
  gemsGranted: number | null;
  livesGranted: number | null;
  streakShieldsGranted: number | null;
  xpMultiplierValue: number | null;
  durationMinutes: number | null;
}

export interface PurchaseResult {
  id: string;
  item: ShopItem;
  gemsSpent: number;
  purchasedAt: string;
  effect: AppliedEffect;
  inventory: ShopInventory;
}

export type GiftStatus = "PENDING" | "CLAIMED" | "EXPIRED";

/** Mirrors `GiftResponse`. `status` is already `EXPIRED` when a pending gift passed `expiresAt`. */
export interface Gift {
  id: string;
  item: ShopItem;
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

export const shopApi = {
  getItems: () => apiClient.get<ShopItem[]>("/store/items"),
  /** `GET /inventories/me` — the single client for this endpoint (also re-exported by `inventoryApi`). */
  getMyInventory: () => apiClient.get<ShopInventory>("/inventories/me"),
  purchase: (shopItemId: string) =>
    apiClient.post<PurchaseResult>("/store/purchases", { shopItemId }),
  /** Debits the sender's gems; the recipient (must be a friend) claims it later. `message` max 500 chars. */
  sendGift: (shopItemId: string, recipientUserId: string, message?: string) =>
    apiClient.post<Gift>("/store/gifts", { shopItemId, recipientUserId, message }),
};
