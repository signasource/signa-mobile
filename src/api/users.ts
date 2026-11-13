import { apiClient } from "./client";
import { AuthResponse, ChangePasswordRequest } from "@/types";

export interface UserProfile {
  name: string;
  lastName?: string;
  username: string;
  verified?: boolean;
  /** Métodos de inicio de sesión de la cuenta: LOCAL = correo y contraseña. */
  providers?: ("LOCAL" | "GOOGLE")[];
  /** Ruta de la foto de perfil en la API (ver `avatarUri`); null si no tiene. */
  avatarUrl?: string | null;
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

/** Mirrors `StreakDayResponse`: today added a streak day the app has not celebrated yet. */
export interface StreakDay {
  pending: boolean;
  /** Streak length including today; 0 when nothing is pending. */
  currentStreak: number;
}

export interface DailyGoal {
  dailyGoalMinutes: number;
  minutesToday: number;
}

export interface UserSettings {
  profileHeaderColor: string;
  fontSize?: "SMALL" | "MEDIUM" | "LARGE";
  vibrationEnabled?: boolean;
  notificationsEnabled?: boolean;
  dailyNotificationEnabled?: boolean;
  accountVisibility?: "PUBLIC" | "PRIVATE";
  dailyNotificationTime?: string;
}

export const usersApi = {
  changePassword: (payload: ChangePasswordRequest) =>
    apiClient.put<AuthResponse>("/users/password", payload),

  checkUsernameAvailability: (username: string, signal?: AbortSignal) =>
    apiClient.get<{ available: boolean }>("/users/username-availability", {
      params: { username },
      signal,
    }),

  /** Vincula una cuenta de Google (ID token) a la cuenta actual; puede tener otro correo. */
  linkGoogle: (idToken: string) => apiClient.post<void>("/users/me/google", { idToken }),

  getMe: () => apiClient.get<UserProfile>("/users/me"),

  /** `avatar`: data URL JPEG/PNG/WebP ya achicado (ver `pickAvatar`). Devuelve el perfil nuevo. */
  setAvatar: (avatar: string) => apiClient.put<UserProfile>("/users/me/avatar", { avatar }),

  removeAvatar: () => apiClient.delete<UserProfile>("/users/me/avatar"),

  getStats: () => apiClient.get<UserStats>("/users/me/stats"),

  getStreakDay: () => apiClient.get<StreakDay>("/users/me/streak-day"),

  /** Idempotent. Marks today's streak day as celebrated so it is not offered again. */
  markStreakDaySeen: () => apiClient.post<void>("/users/me/streak-day/seen"),

  getWeeklyXp: () => apiClient.get<WeeklyXpEntry[]>("/users/me/weekly-xp"),

  getDailyGoal: () => apiClient.get<DailyGoal>("/users/daily-goal"),

  updateDailyGoal: (dailyGoalMinutes: number) =>
    apiClient.patch<void>("/users/daily-goal", { dailyGoalMinutes }),

  recordActivity: (minutes: number) =>
    apiClient.post<void>("/users/me/activity", { minutes }),

  getSettings: () => apiClient.get<UserSettings>("/users/settings"),

  updateSettings: (payload: Partial<UserSettings>) =>
    apiClient.patch<UserSettings>("/users/settings", payload),

  updateProfile: (payload: { username: string; name: string; lastName: string }) =>
    apiClient.patch<void>("/users/me", payload),

  deleteMe: () => apiClient.delete<void>("/users/me"),
};
