import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

interface FeedbackBarProps {
  correct: boolean;
  title: string;
  detail: string;
}

export function FeedbackBar({ correct, title, detail }: FeedbackBarProps) {
  const tint = correct ? colors.successLight : colors.dangerLight;
  const tone = correct ? colors.successDark : colors.danger;

  return (
    <View style={[styles.container, { backgroundColor: tint }]}>
      <Ionicons name={correct ? "checkmark-circle" : "close-circle"} size={22} color={tone} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: tone }]}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    padding: 12,
    paddingHorizontal: 14,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  detail: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.text,
    marginTop: 1,
  },
});
