import { apiClient } from "./client";
import { ShopInventory } from "./shop";

/** A gem bundle sold through Google Play. The price lives in Play, not here. */
export interface GemPack {
  id: string;
  /** Google Play in-app product id (e.g. `gems_pack_300`). */
  productId: string;
  gems: number;
  sortOrder: number;
}

export interface GemPurchaseResult {
  id: string;
  productId: string;
  gemsGranted: number;
  orderId: string | null;
  purchasedAt: string;
  /** `true` when this purchase token had already been credited before (nothing was added now). */
  alreadyGranted: boolean;
  inventory: ShopInventory;
}

export const gemPurchasesApi = {
  getPacks: () => apiClient.get<GemPack[]>("/store/gem-packs"),
  /** Server-side verification against Google; credits gems exactly once per token. */
  redeem: (productId: string, purchaseToken: string) =>
    apiClient.post<GemPurchaseResult>("/store/gem-purchases", { productId, purchaseToken }),
};
