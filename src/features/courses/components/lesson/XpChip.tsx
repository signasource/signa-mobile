import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

type State = "idle" | "correct" | "incorrect";

interface XpChipProps {
  xp: number;
  state: State;
}

export function XpChip({ xp, state }: XpChipProps) {
  if (state === "incorrect") {
    return (
      <View style={[styles.chip, { backgroundColor: colors.dangerLight }]}>
        <Ionicons name="heart-dislike" size={12} color={colors.danger} />
        <Text style={[styles.text, { color: colors.danger }]}>−1 vida</Text>
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
