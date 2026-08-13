import { apiClient } from "@/api/client";
import {
  PurchaseRequest,
  PurchaseResponse,
  SendGiftRequest,
  GiftResponse,
  ShopItemResponse,
  ShopItemType,
  UserInventoryResponse,
} from "./types";

/**
 * InventoryController.java, ShopItemController.java, PurchaseController.java,
 * GiftController.java (paquete gamification de signa-api).
 */
export const shopApi = {
  // GET /inventories/me
  getInventory: () => apiClient.get<UserInventoryResponse>("/inventories/me"),

  // GET /store/items?type=<ShopItemType>
  listItems: (type?: ShopItemType) =>
    apiClient.get<ShopItemResponse[]>("/store/items", { params: type ? { type } : undefined }),

  // POST /store/purchases
  purchase: (payload: PurchaseRequest) => apiClient.post<PurchaseResponse>("/store/purchases", payload),

  // POST /store/gifts
  sendGift: (payload: SendGiftRequest) => apiClient.post<GiftResponse>("/store/gifts", payload),
};
