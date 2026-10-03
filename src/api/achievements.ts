import { apiClient } from "./client";
import type { PublicAchievement } from "./social";

/** Mirrors `AchievementResponse`; same shape the public profile receives. */
export type Achievement = PublicAchievement;

export const achievementsApi = {
  getAchievements: (unlocked: boolean) =>
    apiClient.get<Achievement[]>("/achievements", { params: { unlocked } }),
  /** Earned achievements whose celebration hasn't been shown yet, oldest first. */
  getUnseen: () => apiClient.get<Achievement[]>("/achievements/unseen"),
  markSeen: (id: string) => apiClient.post<void>(`/achievements/${id}/seen`),
};
