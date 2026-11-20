import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import type { Achievement } from "@/api/achievements";
import { AchievementCoin } from "@/features/achievements/components/AchievementCoin";
import { StreakMedal } from "@/features/achievements/components/StreakMedal";
import { isStreakAchievement } from "@/features/achievements/streakTier";

interface AchievementArtProps {
  achievement: Pick<Achievement, "criteriaType" | "criteriaValue">;
  size: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The art of an earned achievement: the streak medal or its coin. Gate it with `hasAchievementArt`. */
export function AchievementArt({ achievement, size, animated, style }: AchievementArtProps) {
  if (isStreakAchievement(achievement)) {
    return <StreakMedal days={achievement.criteriaValue} size={size} animated={animated} style={style} />;
  }
  return <AchievementCoin achievement={achievement} size={size} animated={animated} style={style} />;
}
