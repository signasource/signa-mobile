import { apiClient } from "./client";

export type ChallengeType = "FIRST_STEPS" | "DAILY" | "WEEKLY";

export type ChallengeCriteriaType =
  | "COMPLETE_LESSONS"
  | "EARN_XP"
  | "PERFECT_LESSONS"
  | "CAMERA_PRACTICES"
  | "STREAK_DAYS"
  | "FRIEND_REQUESTS_SENT";

export type ChallengeRewardType = "GEMS" | "LIFE" | "XP_MULTIPLIER" | "STREAK_SHIELD";

/** Mirrors `ChallengeResponse`. `id` is the user's own row: it is what `claim` takes. */
export interface Challenge {
  id: string;
  code: string;
  title: string;
  description: string | null;
  challengeType: ChallengeType;
  criteriaType: ChallengeCriteriaType;
  target: number;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
  rewardType: ChallengeRewardType;
  rewardQuantity: number;
  rewardDurationMinutes: number | null;
  rewardMultiplierValue: number | null;
}

/**
 * Mirrors `ChallengesResponse`. `daily` stays empty until every first step has been claimed.
 * `resetsAt` is when today's daily challenges roll over (midnight in Argentina).
 */
export interface Challenges {
  firstSteps: Challenge[];
  firstStepsDone: boolean;
  daily: Challenge[];
  resetsAt: string;
}

/** Mirrors `ChallengeClaimResponse`. `gems` is the balance after the claim. */
export interface ChallengeClaim {
  challenge: Challenge;
  gems: number;
}

export const challengesApi = {
  getChallenges: () => apiClient.get<Challenges>("/challenges"),
  /** Credits the reward server-side; only a completed, unclaimed challenge qualifies. */
  claim: (id: string) => apiClient.post<ChallengeClaim>(`/challenges/${id}/claim`),
};
