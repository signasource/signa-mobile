import { apiClient } from "./client";

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  earnedAt?: string;
  earnedLabel?: string;
  progress?: string;
}

export const achievementsApi = {
  getAchievements: (unlocked: boolean) =>
    apiClient.get<Achievement[]>("/achievements", { params: { unlocked } }),
};
