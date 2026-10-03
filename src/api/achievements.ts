import { apiClient } from "./client";
import type { PublicAchievement } from "./social";

/** Mirrors `AchievementResponse`; same shape the public profile receives. */
export type Achievement = PublicAchievement;

export const achievementsApi = {
  getAchievements: (unlocked: boolean) =>
    apiClient.get<Achievement[]>("/achievements", { params: { unlocked } }),
};
