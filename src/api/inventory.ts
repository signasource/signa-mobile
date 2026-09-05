import { apiClient } from "./client";
import { LivesMode } from "./shop";

export interface UserInventory {
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

export const inventoryApi = {
  getMyInventory: () => apiClient.get<UserInventory>("/inventories/me"),
};
