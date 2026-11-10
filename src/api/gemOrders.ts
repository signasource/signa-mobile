import { apiClient } from "./client";
import { ShopInventory } from "./shop";

/** A gem bundle sold through Mercado Pago. The price lives in the backend. */
export interface GemPack {
  id: string;
  /** Stable pack code (e.g. `gems_pack_300`). */
  productId: string;
  gems: number;
  /** Price in `currency` (ARS). */
  price: number;
  currency: string;
  sortOrder: number;
}

export interface GemCheckout {
  orderId: string;
  /** Mercado Pago Checkout Pro URL to open in the browser. */
  checkoutUrl: string;
}

export type GemOrderStatus = "PENDING" | "PAID" | "REFUNDED";

export interface GemOrder {
  id: string;
  status: GemOrderStatus;
  gems: number;
  inventory: ShopInventory;
}

/** An order whose payment is in process at Mercado Pago (cash, transfer, review). */
export interface PendingGemOrder {
  id: string;
  gems: number;
  amount: number;
  currency: string;
  createdAt: string;
}

export const gemOrdersApi = {
  getPacks: () => apiClient.get<GemPack[]>("/store/gem-packs"),
  /** Orders still waiting on Mercado Pago; the server re-checks them (and credits approved ones). */
  getPending: () => apiClient.get<PendingGemOrder[]>("/store/gem-orders/pending"),
  createOrder: (packId: string) => apiClient.post<GemCheckout>("/store/gem-orders", { packId }),
  /** Server re-reads the order from Mercado Pago and credits the gems once if it was paid. */
  syncOrder: (orderId: string) => apiClient.post<GemOrder>(`/store/gem-orders/${orderId}/sync`),
};
