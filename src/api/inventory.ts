import { apiClient } from "./client";

export interface UserInventory {
  gems: number;
  streakShields: number;
  lives: number;
  xpMultiplier: number;
  totalSignsLearned: number;
}

export const inventoryApi = {
  getMyInventory: () => apiClient.get<UserInventory>("/inventories/me"),
};
