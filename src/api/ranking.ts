import { apiClient } from "./client";

export interface RankingEntry {
  rank: number;
  id: string;
  username: string;
  name: string;
  weeklyXp: number;
  currentStreak: number;
  /** Positive = moved up; negative = moved down; null = no previous data. */
  delta: number | null;
}

export interface MyRankingPosition {
  rank: number;
  weeklyXp: number;
  delta: number | null;
  /** Pre-formatted Spanish gap text, e.g. "Te faltan 320 XP para entrar al top 10". */
  gapText: string | null;
}

export interface WeeklyRanking {
  entries: RankingEntry[];
  total: number;
  me: MyRankingPosition;
}

export const rankingApi = {
  getGlobal: () => apiClient.get<WeeklyRanking>("/ranking/global"),
  getFriends: () => apiClient.get<WeeklyRanking>("/ranking/friends"),
};
