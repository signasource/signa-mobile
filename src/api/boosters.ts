import { apiClient } from "./client";
import type { PurchaseResult } from "./shop";

/** Boosters that are stored on purchase and activated later. */
export type BoosterType = "XP_MULTIPLIER" | "UNLIMITED_LIVES";

/** Mirrors `StoredBoostersResponse`: bought but not yet activated. */
export interface StoredBoosters {
  xpMultiplier: number;
  unlimitedLives: number;
}

export const boostersApi = {
  /** `GET /boosters` — how many of each booster the user owns and has not activated. */
  getStored: () => apiClient.get<StoredBoosters>("/boosters"),
  /** `POST /boosters/{type}/activate` — consumes one stored booster; 404 if there is none. */
  activate: (type: BoosterType) =>
    apiClient.post<PurchaseResult>(`/boosters/${type}/activate`),
};
