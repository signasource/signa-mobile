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

export const shopApi = {
  getItems: () => apiClient.get<ShopItem[]>("/store/items"),
  getMyInventory: () => apiClient.get<ShopInventory>("/inventories/me"),
  purchase: (shopItemId: string) =>
    apiClient.post<PurchaseResult>("/store/purchases", { shopItemId }),
};
