export const ONBOARDING_TOTAL_STEPS = 5;

export type ExperienceLevel = "novice" | "some" | "fluent";
export type DailyGoalMinutes = 5 | 10 | 15 | 20;
export type MotivationReason = "family" | "work" | "curiosity" | "inclusion";

export interface OnboardingData {
  dailyGoal: DailyGoalMinutes | null;
  level: ExperienceLevel | null;
  reasons: MotivationReason[];
}
