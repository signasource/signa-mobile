import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { formatCountdown } from "@/hooks/useSecondsLeft";
import type { LivesState } from "./useLives";

interface LivesTimerChipProps {
  state: LivesState;
  /** Show "Completas" when the bar is full (otherwise the chip hides in that case). */
  showFull?: boolean;
  /** Prefix the regeneration countdown with "Próxima vida en". */
  labeled?: boolean;
}

/**
 * The one lives timer chip: unlimited lives (blue, infinity), time until the next life
 * (neutral, clock) or a full bar (green, check). Same pill as Perfil → Vidas.
 */
export function LivesTimerChip({ state, showFull = false, labeled = false }: LivesTimerChipProps) {
  if (!state.ready) return null;

  let icon: keyof typeof Ionicons.glyphMap;
  let text: string;
  let fg: string;
  let bg: string;
  if (state.unlimited) {
    icon = "infinite";
    text = state.unlimitedSecs > 0 ? formatCountdown(state.unlimitedSecs) : "Sin límite";
    fg = colors.primaryDark;
    bg = colors.primaryLight;
  } else if (state.nextLifeSecs != null) {
    icon = "time-outline";
    text = `${labeled ? "Próxima vida en " : ""}${formatCountdown(state.nextLifeSecs)}`;
    fg = colors.neutral600;
    bg = colors.neutral100;
  } else if (showFull) {
    icon = "checkmark-circle";
    text = "Completas";
    fg = colors.successDark;
    bg = colors.successLight;
  } else {
    return null;
  }

  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={13} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
  },
});
