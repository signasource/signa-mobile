import { apiClient } from "./client";
import {
  GiftClaimResponse,
  GiftResponse,
  GiftStatus,
  PurchaseRequest,
  PurchaseResponse,
  SendGiftRequest,
  ShopItemResponse,
  ShopItemType,
} from "@/types";

/**
 * ShopItemController.java, PurchaseController.java, GiftController.java
 */
export const storeApi = {
  getItems: (type?: ShopItemType) =>
    apiClient.get<ShopItemResponse[]>("/store/items", { params: type ? { type } : undefined }),

  getItemById: (id: string) => apiClient.get<ShopItemResponse>(`/store/items/${id}`),

  purchase: (payload: PurchaseRequest) =>
    apiClient.post<PurchaseResponse>("/store/purchases", payload),

  sendGift: (payload: SendGiftRequest) => apiClient.post<GiftResponse>("/store/gifts", payload),

  getReceivedGifts: (status?: GiftStatus) =>
    apiClient.get<GiftResponse[]>("/store/gifts/received", {
      params: status ? { status } : undefined,
    }),

  getSentGifts: () => apiClient.get<GiftResponse[]>("/store/gifts/sent"),

  claimGift: (id: string) => apiClient.post<GiftClaimResponse>(`/store/gifts/${id}/claim`),
};
