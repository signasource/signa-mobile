import { apiClient } from "./client";
import { UserInventoryResponse } from "@/types";

/**
 * InventoryController.java
 */
export const inventoryApi = {
  getMyInventory: () => apiClient.get<UserInventoryResponse>("/inventories/me"),
};
