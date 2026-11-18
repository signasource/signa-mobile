import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

type State = "idle" | "correct" | "incorrect" | "skipped";

interface XpChipProps {
  xp: number;
  state: State;
  unlimitedLives?: boolean;
}

export function XpChip({ xp, state, unlimitedLives }: XpChipProps) {
  if (state === "incorrect" && !unlimitedLives) {
    return (
      <View style={[styles.chip, { backgroundColor: colors.dangerLight }]}>
        <Ionicons name="heart-dislike" size={12} color={colors.danger} />
        <Text style={[styles.text, { color: colors.danger }]}>−1 vida</Text>
      </View>
    );
  }

  if (state === "skipped") {
    return (
      <View style={[styles.chip, { backgroundColor: colors.fill }]}>
        <Ionicons name="arrow-forward-circle-outline" size={12} color={colors.textMuted} />
        <Text style={[styles.text, { color: colors.textMuted }]}>Omitida</Text>
      </View>
    );
  }

  const correct = state === "correct";
  return (
    <View style={[styles.chip, { backgroundColor: correct ? colors.successLight : colors.primaryLight }]}>
      <Ionicons name="flash" size={12} color={correct ? colors.successDark : colors.primaryDark} />
      <Text style={[styles.text, { color: correct ? colors.successDark : colors.primaryDark }]}>
        {correct ? `+${xp} XP` : `${xp} XP`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
    flexShrink: 0,
  },
  text: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
  },
});
