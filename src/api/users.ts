import { apiClient } from "./client";
import { AuthResponse, ChangePasswordRequest } from "@/types";

export interface UserProfile {
  name: string;
  username: string;
}

export interface WeeklyXpEntry {
  date: string;
  xpEarned: number;
}

export interface UserStats {
  totalXp: number;
  currentStreak: number;
  weeklyXp: number;
  weeklyRank: number;
}

export interface DailyGoal {
  dailyGoalMinutes: number;
  minutesToday: number;
}

export const usersApi = {
  changePassword: (payload: ChangePasswordRequest) =>
    apiClient.put<AuthResponse>("/users/password", payload),

  checkUsernameAvailability: (username: string, signal?: AbortSignal) =>
    apiClient.get<{ available: boolean }>("/users/username-availability", {
      params: { username },
      signal,
    }),

  getMe: () => apiClient.get<UserProfile>("/users/me"),

  getStats: () => apiClient.get<UserStats>("/users/me/stats"),

  getWeeklyXp: () => apiClient.get<WeeklyXpEntry[]>("/users/me/weekly-xp"),

  getDailyGoal: () => apiClient.get<DailyGoal>("/users/daily-goal"),

  updateDailyGoal: (dailyGoalMinutes: number) =>
    apiClient.patch<void>("/users/daily-goal", { dailyGoalMinutes }),

  recordActivity: (minutes: number) =>
    apiClient.post<void>("/users/me/activity", { minutes }),
};
