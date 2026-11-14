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

export interface GemOrderHistoryItem {
  id: string;
  packName: string;
  gems: number;
  amount: number;
  currency: string;
  status: GemOrderStatus;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  refundRequestStatus: "PENDING" | "RESOLVED" | null;
}

export interface RefundEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export interface UserRefundRequest {
  id: string;
  purchaseType: string;
  purchaseId: string;
  reason: string;
  message: string;
  status: string;
  createdAt: string;
  productName: string | null;
  amount: number | null;
  currency: string | null;
}

export const gemOrdersApi = {
  getPacks: () => apiClient.get<GemPack[]>("/store/gem-packs"),
  /** Orders still waiting on Mercado Pago; the server re-checks them (and credits approved ones). */
  getPending: () => apiClient.get<PendingGemOrder[]>("/store/gem-orders/pending"),
  createOrder: (packId: string) => apiClient.post<GemCheckout>("/store/gem-orders", { packId }),
  /** Server re-reads the order from Mercado Pago and credits the gems once if it was paid. */
  syncOrder: (orderId: string) => apiClient.post<GemOrder>(`/store/gem-orders/${orderId}/sync`),
  getHistory: () => apiClient.get<GemOrderHistoryItem[]>("/store/gem-orders"),
  checkRefundEligibility: (orderId: string) =>
    apiClient.get<RefundEligibilityResult>(`/store/gem-orders/${orderId}/refund-eligibility`),
  createRefundRequest: (orderId: string, data: { reason: string; message: string }) =>
    apiClient.post<UserRefundRequest>(`/store/gem-orders/${orderId}/refund-request`, data),
};
